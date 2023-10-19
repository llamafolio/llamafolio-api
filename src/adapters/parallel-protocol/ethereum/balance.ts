import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  vaultId: {
    inputs: [
      { internalType: 'address', name: '_collateralType', type: 'address' },
      { internalType: 'address', name: '_owner', type: 'address' },
    ],
    name: 'vaultId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vaults: {
    inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }],
    name: 'vaults',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'collateralType', type: 'address' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'collateralBalance', type: 'uint256' },
          { internalType: 'uint256', name: 'baseDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct IVaultsDataProvider.Vault',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  collateralMinCollateralRatio: {
    inputs: [{ internalType: 'address', name: '_collateralType', type: 'address' }],
    name: 'collateralMinCollateralRatio',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vaultCollateralBalance: {
    inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }],
    name: 'vaultCollateralBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vaultDebt: {
    inputs: [{ internalType: 'uint256', name: '_vaultId', type: 'uint256' }],
    name: 'vaultDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      { internalType: 'uint256', name: 'amount0Current', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1Current', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  stake: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'stake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingMIMO: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingMIMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PAR: Contract = {
  chain: 'ethereum',
  address: '0x68037790a0229e9ce6eaa8a99ea92964106c4703',
  decimals: 18,
  symbol: 'PAR',
}

const PARbyChain: { [key: string]: Contract } = {
  ethereum: PAR,
  polygon: replaceAddress('0xe2aa7db6da1dae97c5f5c6914d285fbfcc32a128'),
  fantom: replaceAddress('0x13082681E8CE9bd0aF505912d306403592490Fc7'),
}

function replaceAddress(address: `0x${string}`) {
  return { ...PAR, address: address }
}

export async function getParallelLendBalances(ctx: BalancesContext, vault: Contract, config: Contract) {
  if (!vault) return []

  const assets = vault.underlyings as Contract[]
  if (!assets) return []

  const MCRsRes = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: config.address, params: [asset.address] }) as const),
    abi: abi.collateralMinCollateralRatio,
  })

  const fmtAssets = mapSuccessFilter(MCRsRes, (res, idx) => ({
    ...assets[idx],
    MCR: res.output > 0 ? parseFloatBI(res.output, 18) : undefined,
  }))

  const userVaultId = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: vault.address, params: [asset.address, ctx.address] }) as const),
    abi: abi.vaultId,
  })

  const userVaults = mapSuccessFilter(userVaultId, (res, index) => ({
    ...fmtAssets[index],
    token: res.input.params[0],
    vaultId: res.output,
  })).filter((vault) => vault.vaultId !== 0n)

  const [userCollateralsRes, userDebtsRes] = await Promise.all([
    multicall({
      ctx,
      calls: userVaults.map((userVault) => ({ target: vault.address, params: [userVault.vaultId] }) as const),
      abi: abi.vaultCollateralBalance,
    }),
    multicall({
      ctx,
      calls: userVaults.map((userVault) => ({ target: vault.address, params: [userVault.vaultId] }) as const),
      abi: abi.vaultDebt,
    }),
  ])

  return mapMultiSuccessFilter(
    userCollateralsRes.map((_, i) => [userCollateralsRes[i], userDebtsRes[i]]),

    (res, index) => {
      const userVault = userVaults[index]
      const [{ output: userCollateral }, { output: userdebt }] = res.inputOutputPairs

      const lendBalance: LendBalance = {
        ...userVault,
        amount: userCollateral,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrowBalance: BorrowBalance = {
        ...PARbyChain[ctx.chain],
        amount: userdebt,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lendBalance, borrowBalance] }
    },
  )
}

export async function getParallelLpFarmBalances(ctx: BalancesContext, lpFarmers: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes, underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.stake,
    }),
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.pendingMIMO,
    }),
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.token! }) as const),
      abi: abi.getUnderlyingBalances,
    }),
    multicall({
      ctx,
      calls: lpFarmers.map((farmer) => ({ target: farmer.token! }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [
      userBalancesRes[i],
      userPendingRewardsRes[i],
      underlyingsBalancesRes[i],
      totalSuppliesRes[i],
    ]),
    (res, index) => {
      const lpFarmer = lpFarmers[index]
      const { underlyings, rewards } = lpFarmer as { underlyings: Contract[]; rewards: Contract[] }

      if (!underlyings || !rewards) return null

      const [
        { output: userBalancesRes },
        { output: userPendingRewardsRes },
        { output: underlyingsBalancesRes },
        { output: totalSuppliesRes },
      ] = res.inputOutputPairs

      if (totalSuppliesRes === 0n) return null

      const updateUnderlyings = underlyings.map((underlying, x) => ({
        ...underlying,
        amount: (userBalancesRes * underlyingsBalancesRes[x]) / totalSuppliesRes,
      }))

      return {
        ...lpFarmer,
        amount: userBalancesRes,
        underlyings: updateUnderlyings,
        rewards: [{ ...rewards?.[0], amount: userPendingRewardsRes }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish) as Balance[]
}

export async function getParallelBPTFarmBalances(ctx: BalancesContext, bptFarmers: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: bptFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.stake,
    }),
    multicall({
      ctx,
      calls: bptFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.pendingMIMO,
    }),
  ])

  const balances = mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], userPendingRewardsRes[i]]),
    (res, index) => {
      const bptFarmer = bptFarmers[index]
      const { underlyings, rewards } = bptFarmer as { underlyings: Contract[]; rewards: Contract[] }

      if (!underlyings || !rewards) return null

      const [{ output: userBalancesRes }, { output: userPendingRewardsRes }] = res.inputOutputPairs

      return {
        ...bptFarmer,
        amount: userBalancesRes,
        underlyings,
        rewards: [{ ...rewards?.[0], amount: userPendingRewardsRes }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish) as Balance[]

  const poolBalances = await getUnderlyingsBalancesFromBalancer(ctx, balances as IBalancerBalance[], undefined, {
    getAddress: (balance: Balance) => balance.token!,
    getCategory: (balance: Balance) => balance.category,
  })

  return poolBalances
}

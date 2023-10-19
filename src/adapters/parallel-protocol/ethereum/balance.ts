import type { BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'

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

export async function getParallelFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {}

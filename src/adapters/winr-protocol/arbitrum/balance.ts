import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall, type Call } from '@lib/multicall'

const abi = {
  dividendVestedWINRStakes: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'dividendVestedWINRStakes',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'profitDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'weight', type: 'uint256' },
      { internalType: 'uint128', name: 'depositTime', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  dividendWINRStakes: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'dividendWINRStakes',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'profitDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'weight', type: 'uint256' },
      { internalType: 'uint128', name: 'depositTime', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getActiveIndexes: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getActiveIndexes',
    outputs: [{ internalType: 'uint256[]', name: 'indexes', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVestingStake: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'uint256', name: '_index', type: 'uint256' },
    ],
    name: 'getVestingStake',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'weight', type: 'uint256' },
          { internalType: 'uint256', name: 'vestingDuration', type: 'uint256' },
          { internalType: 'uint256', name: 'profitDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'accTokenFirstDay', type: 'uint256' },
          { internalType: 'uint256', name: 'accTokenPerDay', type: 'uint256' },
          { internalType: 'bool', name: 'withdrawn', type: 'bool' },
          { internalType: 'bool', name: 'cancelled', type: 'bool' },
        ],
        internalType: 'struct IWINRStaking.StakeVesting',
        name: '_stake',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  tokenBalances: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingVestingByIndex: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'pendingVestingByIndex',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingDividendRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'pendingDividendRewards',
    outputs: [{ internalType: 'uint256', name: 'pending_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getStakerInfo: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'getStakerInfo',
    outputs: [
      {
        components: [
          { internalType: 'bool', name: 'exist', type: 'bool' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'wlpRewardDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'vWINRRewardDebt', type: 'uint256' },
        ],
        internalType: 'struct GenesisWLPStaking.StakerInfo',
        name: '_stakerInfo',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WLP: Contract = {
  chain: 'arbitrum',
  address: '0x6f7353B59476dbd1dE23d7113BE7A7fbE6F343E5',
  underlyings: [
    {
      address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      stable: false,
      chain: 'arbitrum',
    },
    {
      address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      name: 'Tether',
      symbol: 'USDT',
      decimals: 6,
      stable: true,
      chain: 'arbitrum',
    },
    {
      address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      stable: true,
      chain: 'arbitrum',
    },
    {
      address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      name: 'WETH',
      symbol: 'WETH',
      decimals: 18,
      stable: false,
      chain: 'arbitrum',
    },
    {
      address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      stable: false,
      chain: 'arbitrum',
    },
  ],
}

const vaultAddress: `0x${string}` = '0x8c50528F4624551Aad1e7A265d6242C3b06c9Fca'

export async function getvWINRBalances(ctx: BalancesContext, vStaker: Contract): Promise<Balance[]> {
  const sWINRBalances: Balance[] = []

  const [vWINRBalances, wINRBalances, activeIndexes, pendingRewards] = await fetchInitialBalances(ctx, vStaker)
  const [activevWINRStakeBalances, activevWINRRewardsBalances] = await fetchActiveBalances(ctx, vStaker, activeIndexes)

  const rewards = await getWLPInternalBalances(ctx, vaultAddress, pendingRewards)

  const vWINRBalance = createBalance(vStaker, vWINRBalances[0])
  const WINRBalance = createBalance(vStaker, wINRBalances[0], undefined, rewards)

  for (const [index, activevWINRStakeBalance] of activevWINRStakeBalances.entries()) {
    const activevWINRRewardsBalance = activevWINRRewardsBalances[index]
    if (!activevWINRStakeBalance.success || !activevWINRRewardsBalance.success) continue

    const rewards = await getWLPInternalBalances(ctx, vaultAddress, activevWINRRewardsBalance.output)
    sWINRBalances.push(createBalance(vStaker, activevWINRStakeBalance.output.amount, undefined, rewards))
  }

  return [vWINRBalance, WINRBalance, ...sWINRBalances]
}

export async function getWLPBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const underlyings = await getWLPInternalBalances(ctx, vaultAddress, userBalance)
  return { ...staker, amount: userBalance, underlyings, rewards: undefined, category: 'stake' }
}

export async function getOldWLPBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.getStakerInfo,
  })

  const underlyings = await getWLPInternalBalances(ctx, vaultAddress, userBalance.amount)
  return { ...staker, amount: userBalance.amount, underlyings, rewards: undefined, category: 'stake' }
}

async function fetchInitialBalances(ctx: BalancesContext, vStaker: Contract) {
  return Promise.all([
    call({ ctx, target: vStaker.address, params: [ctx.address], abi: abi.dividendVestedWINRStakes }),
    call({ ctx, target: vStaker.address, params: [ctx.address], abi: abi.dividendWINRStakes }),
    call({ ctx, target: vStaker.address, params: [ctx.address], abi: abi.getActiveIndexes }),
    call({ ctx, target: vStaker.address, params: [ctx.address], abi: abi.pendingDividendRewards }),
  ])
}

async function fetchActiveBalances(ctx: BalancesContext, vStaker: Contract, activeIndexes: readonly bigint[]) {
  const calls: Call<typeof abi.getVestingStake>[] = activeIndexes.map(
    (id) => ({ target: vStaker.address, params: [ctx.address, id] }) as const,
  )

  return Promise.all([
    multicall({ ctx, calls, abi: abi.getVestingStake }),
    multicall({ ctx, calls, abi: abi.pendingVestingByIndex }),
  ])
}

async function getWLPInternalBalances(ctx: BalancesContext, vaultAddress: `0x${string}`, amount: bigint) {
  const tokens = WLP.underlyings as Contract[]

  const [tokenBalances, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: tokens.map((token) => ({ target: vaultAddress, params: [token.address] }) as const),
      abi: abi.tokenBalances,
    }),
    call({
      ctx,
      target: WLP.address,
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapSuccessFilter(tokenBalances, (res, index) => {
    return { ...tokens[index], amount: (amount * res.output) / totalSupply }
  })
}

function createBalance(vStaker: Contract, amount: bigint, underlyings?: Contract[], rewards?: any[]): Balance {
  return { ...vStaker, amount, underlyings: underlyings ?? undefined, rewards: rewards ?? undefined, category: 'stake' }
}

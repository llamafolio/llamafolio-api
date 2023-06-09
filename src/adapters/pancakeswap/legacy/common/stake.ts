import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  stakedToken: {
    inputs: [],
    name: 'stakedToken',
    outputs: [{ internalType: 'contract IERC20Metadata', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20Metadata', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'lastDepositedTime', type: 'uint256' },
      { internalType: 'uint256', name: 'cakeAtLastUserAction', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUserActionTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lockStartTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lockEndTime', type: 'uint256' },
      { internalType: 'uint256', name: 'userBoostedShare', type: 'uint256' },
      { internalType: 'bool', name: 'locked', type: 'bool' },
      { internalType: 'uint256', name: 'lockedAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const cake_bsc: Token = {
  chain: 'bsc',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'CAKE',
  decimals: 18,
}
const cake_eth: Token = {
  chain: 'ethereum',
  address: '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898',
  symbol: 'CAKE',
  decimals: 18,
}

const CAKE: { [key: string]: Token } = {
  ethereum: cake_eth,
  bsc: cake_bsc,
}

export async function getStakersBalances(ctx: BalancesContext, stakers: Contract[]) {
  const balances: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = stakers.map((staker) => ({
    target: staker.address,
    params: [ctx.address],
  }))

  const [userBalanceOfRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const amount = userBalanceOfRes[stakerIdx].output?.[0] || 0n
    const rewardsAmount = pendingRewardsRes[stakerIdx].output || 0n

    balances.push({
      ...staker,
      decimals: CAKE[ctx.chain].decimals,
      symbol: CAKE[ctx.chain].symbol,
      underlyings: [CAKE[ctx.chain]],
      amount,
      rewards: [{ ...(staker.rewards?.[0] as Contract), amount: rewardsAmount }],
      category: 'stake',
    })
  }

  return balances
}

export async function getStakerCake(ctx: BalancesContext, staker: Contract) {
  const balance: Balance[] = []

  const userInfos = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfos })
  const [
    _shares,
    _lastDepositedTime,
    _cakeAtLastUserAction,
    _lastUserActionTime,
    _lockStartTime,
    _lockEndTime,
    _userBoostedShare,
    _locked,
    lockedAmount,
  ] = userInfos

  const balanceOf = lockedAmount

  balance.push({
    ...staker,
    amount: balanceOf,
    decimals: CAKE[ctx.chain].decimals,
    symbol: CAKE[ctx.chain].symbol,
    underlyings: [CAKE[ctx.chain]],
    // Rewards set as 0n until we find the way to get auto-compound formula
    rewards: [{ ...CAKE[ctx.chain], amount: 0n }],
    category: 'stake',
  })

  return balance
}

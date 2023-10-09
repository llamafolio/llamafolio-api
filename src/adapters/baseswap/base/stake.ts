import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  stakedToken: {
    inputs: [],
    name: 'stakedToken',
    outputs: [{ internalType: 'contract IBEP20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IBEP20', name: '', type: 'address' }],
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
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBaseSwapStakeContracts(ctx: BaseContext, stakers: `0x${string}`[]): Promise<Contract[]> {
  const [stakeTokensRes, rewardTokensRes] = await Promise.all([
    multicall({ ctx, calls: stakers.map((staker) => ({ target: staker }) as const), abi: abi.stakedToken }),
    multicall({ ctx, calls: stakers.map((staker) => ({ target: staker }) as const), abi: abi.rewardToken }),
  ])

  return stakers
    .map((staker, idx) => {
      const stakeTokenRes = stakeTokensRes[idx]
      const rewardTokenRes = rewardTokensRes[idx]

      if (!stakeTokenRes.success || !rewardTokenRes.success) {
        return null
      }

      return {
        chain: ctx.chain,
        address: staker,
        token: stakeTokenRes.output,
        underlyings: [stakeTokenRes.output],
        rewards: [rewardTokenRes.output],
      }
    })
    .filter(isNotNullish)
}

export async function getBaseSwapStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.pendingReward,
    }),
  ])

  for (const [index, staker] of stakers.entries()) {
    const underlyings = staker.underlyings as Contract[]
    const reward = staker.rewards?.[0] as Balance
    const userBalanceRes = userBalancesRes[index]
    const userPendingRewardRes = userPendingRewardsRes[index]

    if (!underlyings || !reward || !userBalanceRes.success || !userPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...staker,
      amount: userBalanceRes.output[0],
      underlyings,
      rewards: [{ ...reward, amount: userPendingRewardRes.output }],
      category: 'stake',
    })
  }

  return balances
}

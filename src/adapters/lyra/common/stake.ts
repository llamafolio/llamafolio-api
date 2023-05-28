import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  getTotalRewardsBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getTotalRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLyraStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = stakers.map((staker) => ({
    target: staker.address,
    params: [ctx.address],
  }))

  const [balanceOfsRes, totalRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.getTotalRewardsBalance }),
  ])

  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    const underlyings = staker.underlyings as Contract[]
    const reward = staker.rewards?.[0] as Contract
    const balanceOfRes = balanceOfsRes[idx]
    const totalRewardRes = totalRewardsRes[idx]
    const rewardAmount = totalRewardRes.success ? totalRewardRes.output : 0n

    if (!balanceOfRes.success) {
      continue
    }

    balances.push({
      ...staker,
      amount: balanceOfRes.output,
      decimals: underlyings[0].decimals,
      underlyings,
      rewards: [{ ...reward, amount: rewardAmount }],
      category: 'stake',
    })
  }

  return balances
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  getStaked: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReward: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getJayFarmBalances(ctx: BalancesContext, jayFarmers: Contract[]): Promise<Balance[]> {
  const [stakedAmounts, pendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: jayFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] as const })),
      abi: abi.getStaked,
    }),
    multicall({
      ctx,
      calls: jayFarmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] as const })),
      abi: abi.getReward,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    stakedAmounts.map((_, i) => [stakedAmounts[i], pendingRewards[i]]),
    (res, index) => {
      const pool = jayFarmers[index]
      const underlyings = pool.underlyings as Contract[]
      const reward = pool.rewards![0] as Contract
      if (!underlyings || !reward) return null

      const [{ output: amount }, { output: rewardsAmount }] = res.inputOutputPairs

      return {
        ...pool,
        amount,
        underlyings,
        rewards: [{ ...reward, amount: rewardsAmount }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish)

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}

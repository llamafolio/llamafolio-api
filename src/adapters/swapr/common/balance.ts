import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  stakedTokensOf: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'stakedTokensOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSwaprBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, earnedRewardsOfRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.stakedTokensOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.claimableRewards,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], earnedRewardsOfRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlyings = pool.underlyings as Contract[]
      const rewards = pool.rewards as Balance[]

      const [{ output: balance }, { output: pendingRewards }] = res.inputOutputPairs

      if (balance === 0n) return null

      rewards.forEach((reward, index) => {
        reward.amount = pendingRewards[index]
      })

      return {
        ...pool,
        amount: balance,
        underlyings,
        rewards,
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}

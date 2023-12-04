import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLiquidDriverShadowBalances(
  ctx: BalancesContext,
  shadowContracts: Contract[],
): Promise<Balance[]> {
  const [userAmounts, pendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: shadowContracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: shadowContracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: abi.pendingReward,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userAmounts.map((_, i) => [userAmounts[i], pendingRewards[i]]),

    (res, index) => {
      const pool = shadowContracts[index]
      const underlyings = pool.underlyings as Contract[]
      const reward = pool.rewards![0] as Contract
      const [{ output: balance }, { output: rewardBalance }] = res.inputOutputPairs

      if (balance[0] === 0n) return null

      return {
        ...pool,
        amount: balance[0],
        underlyings,
        rewards: [{ ...reward, amount: rewardBalance }],
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
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
} as const

export async function getRangeBalances(ctx: BalancesContext, pools: Contract[]) {
  const [userBalancesRes, underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.getUnderlyingBalances,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: erc20Abi.totalSupply }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], underlyingsBalancesRes[i], totalSuppliesRes[i]]),
    (res, index) => {
      const underlyings = pools[index].underlyings as Contract[]
      const [{ output: amount }, { output: underlyingBalances }, { output: totalSupply }] = res.inputOutputPairs

      if (!underlyings || totalSupply === 0n) return null

      const updatedUnderlyings = underlyings.map((underlying, i) => {
        return {
          ...underlying,
          amount: (underlyingBalances[i] * amount) / totalSupply,
        }
      })

      return {
        ...pools[index],
        amount,
        underlyings: updatedUnderlyings,
        rewards: undefined,
        category: 'lp',
      }
    },
  ).filter(isNotNullish) as Balance[]
}

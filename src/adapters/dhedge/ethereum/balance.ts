import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  tokenPrice: {
    inputs: [],
    name: 'tokenPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getdHedgeBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, pricePerFullSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.tokenPrice,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], pricePerFullSharesRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings?.[0] as Contract
      const [{ output: userBalance }, { output: pricePerFullShareRes }] = res.inputOutputPairs as any

      if (userBalance === 0n) return null

      const pricePerFullShare = parseFloatBI(pricePerFullShareRes, 18)
      const underlyingBalance = Number(userBalance) * pricePerFullShare

      return {
        ...pool,
        amount: userBalance,
        underlyings: [{ ...underlying, amount: BigInt(underlyingBalance) }],
        rewards: undefined,
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)
}

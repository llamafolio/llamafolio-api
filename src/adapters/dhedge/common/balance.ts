import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  tokenPrice: {
    inputs: [{ internalType: 'address', name: 'poolAddress', type: 'address' }],
    name: 'tokenPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getdHedgeBalances(
  ctx: BalancesContext,
  pools: Contract[],
  performer: Contract,
): Promise<Balance[]> {
  const [userBalancesRes, pricePerFullSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: performer.address, params: [pool.address] }) as const),
      abi: abi.tokenPrice,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], pricePerFullSharesRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings?.[0] as Contract
      const [{ output: userBalance }, { output: pricePerFullShare }] = res.inputOutputPairs as any

      if (userBalance === 0n) return null

      const underlyingBalance = (userBalance * pricePerFullShare) / parseEther('1.0')

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

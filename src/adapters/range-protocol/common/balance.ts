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

  // BEFORE
  // for (const [index, pool] of pools.entries()) {
  //   const underlyings = pool.underlyings as Contract[]
  //   const userBalanceRes = userBalancesRes[index]
  //   const underlyingsBalanceRes = underlyingsBalancesRes[index]
  //   const totalSupplyRes = totalSuppliesRes[index]

  //   if (
  //     !underlyings ||
  //     !userBalanceRes.success ||
  //     !underlyingsBalanceRes.success ||
  //     !totalSupplyRes.success ||
  //     totalSupplyRes.output === 0n
  //   ) {
  //     continue
  //   }

  //   const [underlying0Amount, underlying1Amount] = underlyingsBalanceRes.output

  //   balances.push({
  //     ...pool,
  //     amount: userBalanceRes.output,
  //     underlyings: [
  //       { ...underlyings[0], amount: (underlying0Amount * userBalanceRes.output) / totalSupplyRes.output },
  //       { ...underlyings[1], amount: (underlying1Amount * userBalanceRes.output) / totalSupplyRes.output },
  //     ],
  //     rewards: undefined,
  //     category: 'lp',
  //   })
  // }

  // NOW
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

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

export async function getToupeeFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const poolBalances: Balance[] = mapSuccessFilter(userBalances, (res, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]

    return {
      ...pools[index],
      amount: res.output,
      underlyings,
      rewards: undefined,
      category: 'farm',
    }
  })

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}

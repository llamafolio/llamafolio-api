import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getCopraBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  return mapSuccessFilter(userBalances, (res, index) => {
    return {
      ...pools[index],
      amount: res.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'farm',
    }
  })
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getBlueBerryBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const shareBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  return mapSuccessFilter(shareBalances, (res, index) => ({
    ...(pools[index] as Balance),
    amount: res.output,
    decimals: 10,
    category: 'farm',
  }))
}

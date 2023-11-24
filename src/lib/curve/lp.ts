import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

export async function getCurvePoolBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await fetchUserBalances(ctx, pools)
  const poolBalances = processBalances(pools, userBalancesRes)
  return getCurveUnderlyingsBalances(ctx, poolBalances)
}

async function fetchUserBalances(ctx: BalancesContext, pools: Contract[]): Promise<any[]> {
  return multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.token!, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })
}

function processBalances(pools: Contract[], userBalancesRes: any[]): Balance[] {
  return mapSuccessFilter(userBalancesRes, (res, index) =>
    res.output === 0n ? null : { ...(pools[index] as Balance), amount: res.output, category: 'lp' as Category },
  ).filter(isNotNullish)
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy, mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const CATEGORY: { [key: string]: Category } = {
  SY: 'stake',
  PT: 'stake',
  PENDLE_LP: 'lp',
  YT: 'farm',
}

export async function getPendleBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[][]> {
  const sortedPools = groupBy(pools, 'baseType')

  const SY = sortedPools.SY ?? []
  const PT = sortedPools.PT ?? []
  const PENDLE_LP = sortedPools.PENDLE_LP ?? []
  const YT = sortedPools.YT ?? []

  return Promise.all([getPendleProcessLPBalances(ctx, PENDLE_LP), getPendleProcessBalances(ctx, [...SY, ...PT, ...YT])])
}

async function getPendleProcessBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userShares = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  return mapSuccessFilter(userShares, (res, index) => ({
    ...pools[index],
    amount: res.output,
    underlyings: pools[index].underlyings,
    rewards: undefined,
    baseType: pools[index].baseType,
    category: CATEGORY[pools[index].baseType],
  }))
}

async function getPendleProcessLPBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const poolBalances = await getPendleProcessBalances(ctx, pools)
  return getUnderlyingBalances(ctx, poolBalances)
}

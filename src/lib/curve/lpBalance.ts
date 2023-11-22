import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { getUnderlyingsPoolsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

// interface PoolData {
//   address: string
//   coinsBalance: CoinBalance[]
//   totalSupply: string
// }

// interface CoinBalance {
//   poolBalance: bigint
// }

export async function getCurvePoolBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await fetchUserBalances(ctx, pools)
  const poolBalances = processBalances(pools, userBalancesRes)
  return getUnderlyingsPoolsBalances(ctx, poolBalances)
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

// export async function getUnderlyingsPoolsBalances(
//   ctx: BalancesContext,
//   rawPoolBalances: Balance[],
// ): Promise<Balance[]> {
//   const pools = await fetchPoolsData(ctx)
//   return calculateUnderlyingsBalances(rawPoolBalances, pools)
// }

// async function fetchPoolsData(ctx: BalancesContext): Promise<PoolData[]> {
//   const registries: string[] = await getCurveRegistriesIds(ctx)
//   const urls: string[] = registries.map((registry) => `https://api.curve.fi/api/getPools/${ctx.chain}/${registry}`)

//   const datasPromises: Promise<any>[] = urls.map((url) => fetch(url).then((res) => res.json()))
//   const allDatas: any[] = await Promise.all(datasPromises)

//   return processPoolDatas(allDatas)
// }

// function processPoolDatas(allDatas: any[]): PoolData[] {
//   return Array.from(
//     new Map(
//       allDatas
//         .flatMap(({ data: { poolData } }) => poolData.map(processSinglePoolData))
//         .map((pool) => [pool.address, pool]),
//     ).values(),
//   )
// }

// function processSinglePoolData({ address, coins, underlyingCoins, totalSupply, isMetaPool }: any): PoolData {
//   return {
//     address,
//     coinsBalance: isMetaPool ? underlyingCoins.map(createCoinBalance) : coins.map(createCoinBalance),
//     totalSupply,
//   }
// }

// function createCoinBalance({ poolBalance }: any): CoinBalance {
//   return { poolBalance }
// }

// function calculateUnderlyingsBalances(rawPoolBalances: Balance[], pools: PoolData[]): Balance[] {
//   return rawPoolBalances.map((rawPool) => processRawPoolBalance(rawPool, pools)).filter(isNotNullish)
// }

// function processRawPoolBalance(rawPool: Balance, pools: PoolData[]): Balance | null {
//   const matchingPool = pools.find((p) => p.address === rawPool.address)
//   if (!matchingPool || !rawPool.underlyings) return null

//   rawPool.underlyings.forEach((underlying: Contract, index) => {
//     underlying.amount = calculateUnderlyingAmount(
//       rawPool.amount,
//       matchingPool.coinsBalance[index],
//       matchingPool.totalSupply,
//     )
//   })

//   return {
//     ...rawPool,
//     underlyings: rawPool.underlyings,
//   }
// }

// function calculateUnderlyingAmount(rawAmount: bigint, coinBalance: CoinBalance, totalSupply: string): bigint {
//   return (rawAmount * BigInt(coinBalance.poolBalance)) / BigInt(totalSupply)
// }

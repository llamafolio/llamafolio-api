import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { getCurveRegistriesIds } from '@lib/curve/registries'
import { isNotNullish } from '@lib/type'

type CurveBalance = Balance & {
  token: `0x${string}`
  pool?: `0x${string}`
}

interface PoolData {
  address: `0x${string}`
  token: `0x${string}`
  pool?: `0x${string}`
  coinsBalances: CoinBalance[]
  totalSupply: string
}

type CoinBalance = Contract & {
  poolBalance: bigint
}

const chainId = (chain: Chain) => (chain === 'gnosis' ? 'xdai' : chain)

export async function getCurveUnderlyingsBalances(
  ctx: BalancesContext,
  rawPoolBalances: CurveBalance[],
): Promise<Balance[]> {
  const pools = await fetchPoolsData(ctx)

  return calculateUnderlyingsBalances(rawPoolBalances, pools)
}

async function fetchPoolsData(ctx: BalancesContext): Promise<PoolData[]> {
  const registries: string[] = await getCurveRegistriesIds(ctx)
  const urls: string[] = registries.map(
    (registry) => `https://api.curve.fi/api/getPools/${chainId(ctx.chain)}/${registry}`,
  )

  const datasPromises: Promise<any>[] = urls.map((url) => fetch(url).then((res) => res.json()))
  const allDatas: any[] = await Promise.all(datasPromises)

  return processPoolDatas(ctx, allDatas)
}

function processPoolDatas(ctx: BalancesContext, allDatas: any[]): PoolData[] {
  return Array.from(
    new Map(
      allDatas
        .flatMap(({ data: { poolData } }) => poolData.map((poolData: any) => processSinglePoolData(ctx, poolData)))
        .map((pool) => [pool.address, pool]),
    ).values(),
  )
}

function processSinglePoolData(
  ctx: BalancesContext,
  { address, lpTokenAddress, coins, underlyingCoins, totalSupply, isMetaPool }: any,
): PoolData {
  return {
    address,
    token: lpTokenAddress,
    coinsBalances: isMetaPool
      ? underlyingCoins.map((coin: any) => createCoinBalance(ctx, coin))
      : coins.map((coin: any) => createCoinBalance(ctx, coin)),
    totalSupply,
  }
}

function createCoinBalance(ctx: BalancesContext, { poolBalance, decimals, address, symbol }: any): CoinBalance {
  return { chain: ctx.chain, address, decimals, symbol, poolBalance }
}

function calculateUnderlyingsBalances(rawPoolBalances: CurveBalance[], pools: PoolData[]): Balance[] {
  return rawPoolBalances.map((rawPool) => processRawPoolBalance(rawPool, pools)).filter(isNotNullish)
}

function processRawPoolBalance(rawPool: CurveBalance, pools: PoolData[]): Balance | null {
  const matchingPool = pools.find((p) => p.token.toLowerCase() === rawPool.token.toLowerCase())
  if (!matchingPool) return null

  return {
    ...rawPool,
    underlyings: calculateUnderlyingAmount(rawPool.amount, matchingPool.coinsBalances, matchingPool.totalSupply),
  }
}

function calculateUnderlyingAmount(rawAmount: bigint, coinBalances: CoinBalance[], totalSupply: string): Contract[] {
  return coinBalances.map((coinBalance) => {
    return { ...coinBalance, amount: (rawAmount * BigInt(coinBalance.poolBalance)) / BigInt(totalSupply) }
  })
}

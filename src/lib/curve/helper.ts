import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { getCurveRegistriesIds } from '@lib/curve/registries'
import { isNotNullish } from '@lib/type'

interface PoolData {
  address: `0x${string}`
  token: `0x${string}`
  pool?: `0x${string}`
  coinsBalances: CoinBalance[]
  totalSupply: number
}

type CoinBalance = Contract & {
  poolBalance: bigint
}

const chainId = (chain: Chain) => (chain === 'gnosis' ? 'xdai' : chain)

export async function getCurveUnderlyingsBalances<T extends Balance | Balance[]>(
  ctx: BalancesContext,
  rawPoolBalances: T,
): Promise<any> {
  const pools = await fetchPoolsData(ctx)

  const isCurveLP = Array.isArray(rawPoolBalances)
    ? rawPoolBalances.every((rawPool) => isRelatedToCurvePool(rawPool, pools))
    : isRelatedToCurvePool(rawPoolBalances as Balance, pools)

  if (!isCurveLP) {
    return rawPoolBalances
  }

  const result = Array.isArray(rawPoolBalances)
    ? rawPoolBalances.map((rawPool) => processRawPoolBalance(rawPool, pools)).filter(isNotNullish)
    : processRawPoolBalance(rawPoolBalances as Balance, pools)

  return result as T extends Balance[] ? Balance[] : Balance
}

function isCurveLPToken(tokenAddress: `0x${string}` | undefined, pools: PoolData[]) {
  if (!tokenAddress) return false
  return pools.some((pool) => pool.token.toLowerCase() === tokenAddress.toLowerCase())
}

function isRelatedToCurvePool(rawPool: any, pools: PoolData[]) {
  const tokenCheck = rawPool.token ? isCurveLPToken(rawPool.token, pools) : false
  const underlyingsCheck =
    rawPool.underlyings?.some((underlying: Contract) => isCurveLPToken(underlying.address, pools)) ?? false
  const rewardsCheck = rawPool.rewards?.some((reward: Contract) => isCurveLPToken(reward.address, pools)) ?? false

  return tokenCheck || underlyingsCheck || rewardsCheck
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

function processRawPoolBalance(rawPool: any, pools: PoolData[]): Balance {
  const findMatchingPool = (address: string) => pools.find((pool) => pool.token.toLowerCase() === address.toLowerCase())

  const matchingPoolForToken = rawPool.token ? findMatchingPool(rawPool.token) : null
  if (matchingPoolForToken) {
    rawPool.underlyings = calculateUnderlyingAmount(
      rawPool.amount,
      matchingPoolForToken.coinsBalances,
      matchingPoolForToken.totalSupply,
    )
  }

  const processedRewards =
    rawPool.rewards?.flatMap((reward: Contract) => {
      const matchingPool = findMatchingPool(reward.address)
      return matchingPool
        ? calculateUnderlyingAmount(reward.amount, matchingPool.coinsBalances, matchingPool.totalSupply)
        : reward
    }) || rawPool.rewards

  const processedUnderlyings =
    rawPool.underlyings?.flatMap((underlying: Contract) => {
      const matchingPool = findMatchingPool(underlying.address)
      return matchingPool
        ? calculateUnderlyingAmount(underlying.amount, matchingPool.coinsBalances, matchingPool.totalSupply)
        : underlying
    }) || rawPool.underlyings

  rawPool.rewards = processedRewards
  rawPool.underlyings = processedUnderlyings

  return rawPool
}

function calculateUnderlyingAmount(rawAmount: bigint, coinBalances: CoinBalance[], totalSupply: number): Contract[] {
  return coinBalances
    .map((coinBalance) => {
      if (totalSupply == 0) return null
      return { ...coinBalance, amount: (rawAmount * BigInt(coinBalance.poolBalance)) / BigInt(totalSupply) }
    })
    .filter(isNotNullish)
}

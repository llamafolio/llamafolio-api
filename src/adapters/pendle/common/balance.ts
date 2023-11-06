import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Category } from '@lib/category'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const chainId: { [key: string]: number } = {
  ethereum: 1,
  arbitrum: 42161,
  avalanche: 43114,
  optimism: 10,
  bsc: 56,
}

const CATEGORY: { [key: string]: Category } = {
  SY: 'stake',
  PT: 'stake',
  PENDLE_LP: 'lp',
  YT: 'farm',
}

type IPendleBalances = Balance & {
  baseType: string
  underlyingsAmount: bigint
}

export async function getPendleBalances(ctx: BalancesContext, pools: Contract[]): Promise<any> {
  const API_URL = `https://api-v2.pendle.finance/core/v1/${chainId[ctx.chain]}/users/${ctx.address}/positions`

  const { positions }: any = await fetch(API_URL).then((res) => res.json())

  const matchedPools: IPendleBalances[] = pools
    .map((pool) => {
      const matchingPosition = positions.find(
        (position: any) => position.asset.address.toLowerCase() === pool.address.toLowerCase(),
      )

      if (!matchingPosition) return null

      const underlyings = pool.underlyings as Contract[]
      const category = CATEGORY[matchingPosition.asset.baseType]
      const amount = Math.round(matchingPosition.positionSize * Math.pow(10, matchingPosition.asset.decimals))
      const pricePerFullShare = matchingPosition.asset.price.acc ?? 1
      const underlyingsAmount = Math.round(amount * pricePerFullShare)

      return {
        ...pool,
        amount: BigInt(amount),
        underlyings,
        underlyingsAmount: BigInt(underlyingsAmount),
        rewards: undefined,
        baseType: pool.baseType,
        category,
      }
    })
    .filter(isNotNullish)

  const otherPools = matchedPools.filter((pool) => pool.baseType !== 'PENDLE_LP')
  const pendleLPPools = matchedPools.filter((pool) => pool.baseType === 'PENDLE_LP')

  return Promise.all([getPendleSingleUnderlyings(otherPools), getUnderlyingBalances(ctx, pendleLPPools)])
}

function getPendleSingleUnderlyings(pools: Contract[]) {
  return pools.map((pool) => ({
    ...pool,
    underlyings: [{ ...(pool.underlyings?.[0] as Contract), amount: pool.underlyingsAmount }],
  }))
}

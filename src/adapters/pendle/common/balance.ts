import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

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

export async function getPendleBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
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

  return Promise.all([getPendleSingleUnderlyings(otherPools), getPendle_LPUnderlyingsBalances(ctx, pendleLPPools)])
}

function getPendleSingleUnderlyings(pools: Contract[]) {
  return pools.map((pool) => ({
    ...pool,
    underlyings: [{ ...(pool.underlyings?.[0] as Contract), amount: pool.underlyingsAmount }],
  }))
}

async function getPendle_LPUnderlyingsBalances(ctx: BalancesContext, pools: Contract[]) {
  const [token0BalancesRes, token1BalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: (pool.underlyings?.[0] as Contract).address, params: [pool.address] }) as const,
      ),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: (pool.underlyings?.[1] as Contract).address, params: [pool.address] }) as const,
      ),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    token0BalancesRes.map((_, i) => [token0BalancesRes[i], token1BalancesRes[i], totalSuppliesRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const [underlying0, _underlying1] = pool.underlyings as Contract[]
      const [{ output: token0Balance }, { output: token1Balance }, { output: totalSupply }] = res.inputOutputPairs

      if (totalSupply === 0n) return null

      // underlying0 & underlying1 are identical, the first comes from SY, the second comes from PT
      const deeperUnderlying = underlying0.underlyings?.[0] as Contract
      const amount = BigInt((pool.amount * token0Balance + pool.amount * token1Balance) / totalSupply)

      return {
        ...pool,
        underlyings: [{ ...deeperUnderlying, decimals: 18, amount }],
      }
    },
  ).filter(isNotNullish) as any
}

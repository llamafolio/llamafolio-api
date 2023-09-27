import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import request, { gql } from 'graphql-request'

const abi = {
  querySurplus: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
    ],
    name: 'querySurplus',
    outputs: [{ internalType: 'uint128', name: 'surplus', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  queryRangeTokens: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'base', type: 'address' },
      { internalType: 'address', name: 'quote', type: 'address' },
      { internalType: 'uint256', name: 'poolIdx', type: 'uint256' },
      { internalType: 'int24', name: 'lowerTick', type: 'int24' },
      { internalType: 'int24', name: 'upperTick', type: 'int24' },
    ],
    name: 'queryRangeTokens',
    outputs: [
      { internalType: 'uint128', name: 'liq', type: 'uint128' },
      { internalType: 'uint128', name: 'baseQty', type: 'uint128' },
      { internalType: 'uint128', name: 'quoteQty', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  queryConcRewards: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'base', type: 'address' },
      { internalType: 'address', name: 'quote', type: 'address' },
      { internalType: 'uint256', name: 'poolIdx', type: 'uint256' },
      { internalType: 'int24', name: 'lowerTick', type: 'int24' },
      { internalType: 'int24', name: 'upperTick', type: 'int24' },
    ],
    name: 'queryConcRewards',
    outputs: [
      { internalType: 'uint128', name: 'liqRewards', type: 'uint128' },
      { internalType: 'uint128', name: 'baseRewards', type: 'uint128' },
      { internalType: 'uint128', name: 'quoteRewards', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/crocswap/croc-mainnet'

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const assets: Token[] = [
  { chain: 'ethereum', address: ADDRESS_ZERO, symbol: 'ETH', decimals: 18 },
  { chain: 'ethereum', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', decimals: 6 },
]

export async function getAmbienStakeBalances(
  ctx: BalancesContext,
  _vault: Contract,
  crocQuery: Contract,
): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: crocQuery.address, params: [ctx.address, asset.address] }) as const),
    abi: abi.querySurplus,
  })

  return mapSuccessFilter(userBalances, (res, idx) => ({
    ...assets[idx],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}

export async function getAmbientLpBalances(
  ctx: BalancesContext,
  vault: Contract,
  crocQuery: Contract,
): Promise<Balance[]> {
  const userAddress = ctx.address
  const balances: Balance[] = []

  const query = gql`
    query liquidityChanges {
      liquidityChanges(where: { user: "${userAddress}" }) {
        user
        bidTick
        askTick
        pool {
          base
          quote
          poolIdx
        }
      }
    }
  `

  const { liquidityChanges }: any = await request(GRAPH_URL, query)

  const poolsMap = liquidityChanges.reduce((acc: any, { bidTick, askTick, pool }: any) => {
    let { base, quote } = pool

    base = vault.assets.find((asset: Contract) => asset.address === base) || base
    quote = vault.assets.find((asset: Contract) => asset.address === quote) || quote

    // to prevent duplicate pools
    const poolKey = `${vault.address}-${bidTick}-${askTick}`

    if (!acc.has(poolKey)) {
      acc.set(poolKey, {
        chain: ctx.chain,
        address: vault.address,
        underlyings: [base, quote],
        rewards: [base, quote],
        poolId: pool.poolIdx,
        lowerTick: bidTick,
        upperTick: askTick,
      })
    }

    return acc
  }, new Map())

  const pools: Contract[] = Array.from(poolsMap.values())

  const [userLiquiditiesRes, userRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(
        (pool) =>
          ({
            target: crocQuery.address,
            params: [
              ctx.address,
              (pool.underlyings![0] as Contract).address,
              (pool.underlyings![1] as Contract).address,
              pool.poolId,
              pool.lowerTick,
              pool.upperTick,
            ],
          }) as const,
      ),
      abi: abi.queryRangeTokens,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) =>
          ({
            target: crocQuery.address,
            params: [
              ctx.address,
              (pool.underlyings![0] as Contract).address,
              (pool.underlyings![1] as Contract).address,
              pool.poolId,
              pool.lowerTick,
              pool.upperTick,
            ],
          }) as const,
      ),
      abi: abi.queryConcRewards,
    }),
  ])

  for (const [index, pool] of pools.entries()) {
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const userLiquidityRes = userLiquiditiesRes[index]
    const userRewardRes = userRewardsRes[index]

    if (!underlyings || !rewards || !userLiquidityRes.success || !userRewardRes.success) {
      continue
    }

    const [liq, baseQty, quoteQty] = userLiquidityRes.output
    const [_, baseRewards, quoteRewards] = userRewardRes.output

    const baseUnderlying = { ...underlyings[0], amount: baseQty }
    const quoteUnderlying = { ...underlyings[1], amount: quoteQty }
    const baseReward = { ...rewards[0], amount: baseRewards }
    const quoteReward = { ...rewards[1], amount: quoteRewards }

    balances.push({
      ...pool,
      symbol: `${baseUnderlying.symbol}-${quoteUnderlying.symbol} LP`,
      decimals: 18,
      amount: liq,
      underlyings: [baseUnderlying, quoteUnderlying].map((asset) =>
        asset.address === ADDRESS_ZERO ? { ...WETH, amount: asset.amount } : asset,
      ),
      rewards: [baseReward, quoteReward].map((asset) =>
        asset.address === ADDRESS_ZERO ? { ...WETH, amount: asset.amount } : asset,
      ),
      category: 'lp',
    })
  }

  return balances
}

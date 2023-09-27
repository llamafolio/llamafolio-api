import type { BaseContext } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import request, { gql } from 'graphql-request'

const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/crocswap/croc-mainnet'

export async function getAmbientPoolTokens(ctx: BaseContext) {
  const query = gql`
    query pools {
      pools {
        base
        quote
      }
    }
  `

  const { pools }: any = await request(GRAPH_URL, query)

  const uniqueAssetsArray: `0x${string}`[] = Array.from(
    pools.reduce((acc: Set<string>, pool: { base: string; quote: string }) => {
      acc.add(pool.base)
      acc.add(pool.quote)
      return acc
    }, new Set<string>()),
  )

  return getERC20Details(ctx, uniqueAssetsArray)
}

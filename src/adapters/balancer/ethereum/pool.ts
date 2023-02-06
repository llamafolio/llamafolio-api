import { BaseContext, Contract } from '@lib/adapter'
import request, { gql } from 'graphql-request'

export async function getOldBalancerPools(ctx: BaseContext, url: string): Promise<Contract[]> {
  const contracts: Contract[] = []

  const query = gql`
    query pools {
      pools(first: 1000, orderBy: liquidity, orderDirection: desc, where: { liquidity_gt: "100" }) {
        id
        symbol
        tokens {
          address
          decimals
          symbol
        }
      }
    }
  `
  const res = await request(url, query)

  for (const pool of res.pools) {
    if (!pool.id || !pool.tokens) {
      continue
    }

    contracts.push({
      chain: 'ethereum',
      address: pool.id,
      symbol: pool.symbol,
      decimals: 18,
      underlyings: pool.tokens.map((underlying: Contract) => ({ ...underlying, chain: ctx.chain })),
    })
  }

  return contracts
}

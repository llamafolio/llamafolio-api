import { BaseContext, Contract } from '@lib/adapter'
import request, { gql } from 'graphql-request'

export async function getBalancerPools(ctx: BaseContext, url: string): Promise<Contract[]> {
  const contracts: Contract[] = []

  const query = gql`
    query pools {
      pools(first: 1000, where: { totalLiquidity_gt: "100" }, orderBy: totalLiquidity, orderDirection: desc) {
        address
        symbol
        tokens {
          address
          symbol
          decimals
        }
      }
    }
  `
  const res = await request(url, query)

  for (const pool of res.pools) {
    if (!pool.address || !pool.tokens) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool.address,
      symbol: pool.symbol,
      decimals: 18,
      underlyings: pool.tokens.map((underlying: Contract) => ({ ...underlying, chain: ctx.chain })),
    })
  }

  return contracts
}

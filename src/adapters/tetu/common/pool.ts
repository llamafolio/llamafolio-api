import type { BaseContext, Contract } from '@lib/adapter'
import request, { gql } from 'graphql-request'

export async function getTetuPools(ctx: BaseContext, url: string): Promise<Contract[]> {
  const contracts: Contract[] = []

  const query = gql`
    query pairs {
      pairs(first: 1000) {
        id
        token0 {
          id
          decimals
          symbol
        }
        token1 {
          id
          decimals
          symbol
        }
      }
    }
  `
  const res: any = await request(url, query)

  for (const { id, token0, token1 } of res.pairs) {
    if (!id || !token0 || !token1) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: id,
      token: id,
      underlyings: [token0.id, token1.id],
    })
  }

  return contracts
}

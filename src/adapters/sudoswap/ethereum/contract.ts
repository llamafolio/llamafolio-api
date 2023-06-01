import type { BaseContext, Contract } from '@lib/adapter'
import request, { gql } from 'graphql-request'

export async function fetchPairs(ctx: BaseContext, graphQl: string) {
  const maxPairs = 3000
  const batchSize = 1000

  let pairs: Contract[] = []
  let skip = 0
  let totalCount = 0

  while (totalCount < maxPairs) {
    const res = await fetchGraphQLData(ctx, graphQl, skip, batchSize)

    pairs = pairs.concat(res)
    totalCount += res.length
    skip += batchSize

    if (res.length < batchSize) {
      break
    }
  }

  return pairs
}

async function fetchGraphQLData(ctx: BaseContext, graphQl: string, skip: number, batchSize: number) {
  const contracts: Contract[] = []

  const query = gql`
    query pairs {
      pairs(first: ${batchSize}, skip: ${skip}) {
        id
        nftIds
      }
    }
  `

  const res: any = await request(graphQl, query)

  for (const pair of res.pairs) {
    if (!pair.id) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pair.id,
      nftIds: pair.nftIds,
    })
  }

  return contracts
}

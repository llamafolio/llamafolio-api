import { Contract } from '@lib/adapter'
import { request } from 'graphql-request'

import { allPoolsQuery } from './queries/query'

const API_URL = 'https://staging.api.maple.finance/v1/graphql'

export async function getContractsFromGraph() {
  const contracts: Contract[] = []

  const {
    results: { list: data },
  } = await request(API_URL, allPoolsQuery, {
    filter: { skip: 0, limit: 100 },
  })

  data.map((pool: Contract) => {
    contracts.push({
      chain: 'ethereum',
      address: pool.contractAddress,
      symbol: pool.liquidityAsset.symbol,
      underlyingTokens: pool.liquidityAsset.address,
      name: pool.liquidityAsset.symbol,
      dName: `${pool.liquidityAsset.symbol} Maple Pool`,
    })
  })

  return contracts
}

const { request } = require('graphql-request')
const { query } = require('./queries/query')

const API_URL = 'https://staging.api.maple.finance/v1/graphql'

export async function getContractsFromGraph() {
  const contracts = []

  const {
    results: { list: data },
  } = await request(API_URL, query, {
    filter: { skip: 0, limit: 100 },
  })
  const pools = data.map((pool) => {
    const tokenPrice = pool.liquidityAsset.price / 1e8

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

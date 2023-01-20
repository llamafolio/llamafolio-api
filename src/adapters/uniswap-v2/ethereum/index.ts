import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'
import { gql, request } from 'graphql-request'

import Pairs from './pairs.json'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getPoolsHighestVolume() {
  const contracts: Contract[] = []

  const url = 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2'

  const query = gql`
    query pairsQuery {
      pairs(first: 500, orderBy: volumeUSD, orderDirection: desc) {
        id
        token0 {
          id
          symbol
          decimals
        }
        token1 {
          id
          symbol
          decimals
        }
      }
    }
  `

  const res = await request(url, query)

  for (const pair of res.pairs) {
    if (!pair.id || !pair.token0?.id || !pair.token1?.id) {
      continue
    }

    contracts.push({
      chain: 'ethereum',
      address: pair.id.toLowerCase(),
      name: 'Uniswap V2',
      symbol: 'UNIV2',
      decimals: 18,
      underlyings: [
        {
          chain: 'ethereum',
          address: pair.token0.id.toLowerCase(),
          symbol: pair.token0.symbol,
          decimals: parseInt(pair.token0.decimals),
        },
        {
          chain: 'ethereum',
          address: pair.token1.id.toLowerCase(),
          symbol: pair.token1.symbol,
          decimals: parseInt(pair.token1.decimals),
        },
      ],
    })
  }

  return contracts
}

export const getContracts = async () => {
  // const pairs = await getPoolsHighestVolume()
  const pairs = Pairs as Contract[]

  return {
    contracts: { pairs },
    // revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
  })

  return {
    balances: balances.map((balance) => ({ ...balance, category: 'farm' })),
  }
}

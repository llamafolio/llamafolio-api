import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'
import { gql, request } from 'graphql-request'

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

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    offset,
    limit,
  })

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
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

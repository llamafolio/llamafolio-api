import { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getPairsBalances } from '@lib/uniswap/v2/pair'
import tokenlists from '@llamafolio/tokens/ethereum/tokenlist.json'
import fs from 'fs'
import { gql, request } from 'graphql-request'

import uniPairsV2 from './uniPairs_v2.json'

async function getPoolsHighestVolume(address: string) {
  const contracts: Contract[] = []

  // const url = 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2'
  const url = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'

  const query = gql`
    query pairs {
      pools(
        first: 1000
        orderBy: volumeUSD
        orderDirection: desc
        where: { token0_: {id: "${address}" } }
      ) {
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

  for (const pair of res.pools) {
    if (!pair.id || !pair.token0?.id || !pair.token1?.id) {
      continue
    }

    contracts.push({
      chain: 'ethereum',
      address: pair.id.toLowerCase(),
      name: 'Uniswap V3',
      symbol: 'UNIV3',
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

const getPairsFromGQL = async () => {
  const pairs: Contract[] = []

  const tokenListAddresses = tokenlists.map((token) => token.address)

  for (let tokenListIdx = 0; tokenListIdx < tokenListAddresses.length; tokenListIdx++) {
    const tokenListAddress = tokenListAddresses[tokenListIdx]
    const pair = await getPoolsHighestVolume(tokenListAddress)

    pairs.push(...pair)
  }

  const saveData = (data: any, file: any) => {
    const finished = (error: any) => {
      if (error) {
        console.error(error)
        return
      }
    }

    const jsonData = JSON.stringify(data, null, 2)
    fs.writeFile(file, jsonData, finished)
  }

  saveData(pairs, 'uniPairs_v3.json')
}

export const getContracts = async () => {
  const pairs = uniPairsV2 as Contract[]

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, { pairs }) => {
  const lpBalances = await getPairsBalances(ctx, pairs || [])

  return {
    balances: lpBalances.map((balance) => ({ ...balance, category: 'farm' })),
  }
}

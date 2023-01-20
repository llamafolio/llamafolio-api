import { Contract } from '@lib/adapter'
import tokenlists from '@llamafolio/tokens/bsc/tokenlist.json'
import fs from 'fs'
import { gql, request } from 'graphql-request'

async function getPoolsHighestVolume(address: string, idx: number) {
  const contracts: Contract[] = []

  const url = 'https://api.thegraph.com/subgraphs/name/pancakeswap/pairs'
  const skip = idx * 1000

  const query = gql`
    query getPairs($skip: Int = ${skip}) {
      pairs(first: 1000, skip: $skip, where: { token0_: { id: "${address}" } }) {
        id
        token0 {
          decimals
          symbol
          id
        }
        token1 {
          decimals
          symbol
          id
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
      name: 'PancakeSwap',
      symbol: 'Cake',
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

export async function getPairsFromGQL() {
  const pairs: Contract[] = []

  const tokenListAddresses = tokenlists.map((token) => token.address)

  for (let tokenListIdx = 0; tokenListIdx < tokenListAddresses.length; tokenListIdx++) {
    for (let idx = 0; idx < 5; idx++) {
      const tokenListAddress = tokenListAddresses[tokenListIdx]
      const pair = await getPoolsHighestVolume(tokenListAddress, idx)

      pairs.push(...pair)
    }
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

  saveData(pairs, 'pancake_all.json')
}

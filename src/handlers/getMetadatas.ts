import { Chain } from '@lib/chains'
import fetch from 'node-fetch'

export interface TokenMetadata {
  chain: string
  adapter: string
  address: string
  symbol: string
  yield: string
  stable: string
}

export async function getMetadatasFromAPI(chain: Chain): Promise<TokenMetadata[]> {
  const url = 'https://defillama-datasets.s3.eu-central-1.amazonaws.com/temp/yields-poolsOld.json'

  if (chain === 'avax') {
    ;(chain as string) = 'avalanche'
  }

  const response = await fetch(url)
  const datas = await response.json()

  if (!datas) {
    throw new Error('Failed to fetch metadatas')
  }

  return Object.values(datas.data)
    .filter((data: any) => data.chain.toLowerCase() === chain)
    .map((data: any) => ({
      chain: data.chain,
      adapter: data.project,
      address: data.pool_old.split('-')[0],
      symbol: data.symbol,
      yield: data.pool,
      stable: data.stablecoin,
    }))
}

export async function mergeTokens(tokensAPI: TokenMetadata[], tokensDB: TokenMetadata[]): Promise<TokenMetadata[]> {
  const mergeFn = (tokenAPI: TokenMetadata): TokenMetadata | undefined => {
    const matchingTokenDB = tokensDB.find((tokenDB) => isAddressMatching(tokenAPI, tokenDB))
    if (matchingTokenDB) {
      return { ...matchingTokenDB, stable: tokenAPI.stable, yield: tokenAPI.yield }
    }
  }

  return tokensAPI.map(mergeFn).filter(Boolean) as TokenMetadata[]
}

const isAddressMatching = (tokenAPI: TokenMetadata, tokenDB: TokenMetadata) => tokenAPI.address === tokenDB.address

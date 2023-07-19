import { environment } from '@environment'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'
import type { Address } from 'viem'
import { getAddress } from 'viem'

const ANKR_BASE_URL = `https://rpc.ankr.com/multichain`

const ankrChain: {
  [chain: string]: string
} = {
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  avalanche: 'avalanche',
  bsc: 'bsc',
  fantom: 'fantom',
  optimism: 'optimism',
  polygon: 'polygon',
}

export async function fetchUserNFTsFromAnkr({
  address,
  chain = ['ethereum', 'arbitrum', 'avalanche', 'bsc', 'fantom', 'optimism', 'polygon'],
  pageSize = 50,
  pageToken,
}: {
  address: Address
  chain?: Array<'ethereum' | 'arbitrum' | 'avalanche' | 'bsc' | 'fantom' | 'optimism' | 'polygon'>
  pageSize?: number
  pageToken?: string
}) {
  const walletAddress = getAddress(address) ?? raise('Invalid address')
  const API_KEY = environment.ANKR_API_KEY ?? raise('Missing ANKR_API_KEY')
  const url = `${ANKR_BASE_URL}/${API_KEY}/?ankr_getNFTsByOwner`
  const response = await fetcher<AnkrAccountNftsResponse | AnkrError>(url, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'ankr_getNFTsByOwner',
      params: {
        walletAddress,
        pageSize,
        blockchain: chain.map((c) => ankrChain[c]),
        pageToken,
      },
      id: 1,
    }),
  })
  if ('error' in response) {
    raise(`[ankr] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }

  return response
}

interface AnkrError {
  jsonrpc: string
  error: {
    code: number
    message: string
  }
  id: any
}

interface AnkrAccountNftsResponse {
  jsonrpc: string
  id: number
  result: {
    owner: string
    assets: Array<AnkrNFT>
    nextPageToken: string
  }
}

interface AnkrNFT {
  blockchain: string
  name: string
  tokenId: string
  tokenUrl: string
  imageUrl: string
  collectionName: string
  symbol: string
  contractType: string
  contractAddress: string
}

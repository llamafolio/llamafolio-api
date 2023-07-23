import environment from '@environment'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import { type Address, getAddress } from 'viem'

const centerChains = [
  'ethereum',
  'arbitrum',
  'avalanche',
  'bsc',
  'celo',
  'fantom',
  'harmony',
  'optimism',
  'polygon',
  // 'solana',
  // 'zora',
  // 'base',
] as const

type CenterChain = (typeof centerChains)[number]

const CENTER_BASE_URL = (chain: CenterChain) => `https://api.center.dev/v2/${chain}-mainnet`
const CENTER_API_KEY = environment.CENTER_API_KEY ?? raise('Missing CENTER_API_KEY')

// https://docs.center.dev/reference/listnftsownedbyaddress-v2
export async function fetchUserNFTs({
  chain = 'ethereum',
  address,
  limit = 1_000,
  offset = 0,
  collection,
  excludeCollection,
}: {
  chain?: CenterChain
  address: Address
  limit?: number
  offset?: number
  collection?: Array<string>
  excludeCollection?: Array<string>
}) {
  const walletAddress = getAddress(address) ?? raise('Invalid address')
  const queryParameters = urlSearchParams({
    limit,
    offset,
    collection: collection?.join(','),
    exclude_collection: excludeCollection?.join(','),
  })
  const url = `${CENTER_BASE_URL(chain)}/${walletAddress}/nfts-owned?${queryParameters}`
  const response = await fetcher<CenterUserNFTsResponse | CenterError>(url, {
    headers: {
      'X-API-Key': CENTER_API_KEY,
    },
  })
  if ('error' in response) {
    raise(`[Center] error when calling ${url}:\n ${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

export async function batchFetchMetadata({
  chain = 'ethereum',
  items,
}: {
  chain?: CenterChain
  items: Array<{ address: String; tokenID: string }>
}) {
  const queryParameters = urlSearchParams({
    apiKey: CENTER_API_KEY,
  })
  const url = `${CENTER_BASE_URL(chain)}/metadata?${queryParameters}`
  const response = await fetcher<Array<CenterNFTMetadata> | CenterError>(url, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  if ('error' in response) {
    raise(`[Center] error when calling ${url}:\n ${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

interface CenterError {
  statusCode?: number
  error: string
  message: string
}

interface CenterUserNFTsResponse {
  items: Array<CenterNFT>
  paging: {
    itemsReturned: number
    limit: number
    offset: number
    onLastPage: boolean
  }
}

export interface CenterNFT {
  network: string
  address: string
  tokenID: string
  blockNumber: number
  contractType: string
  quantity: number
}

export interface CenterNFTMetadata {
  network: string
  address: string
  tokenID: string
  collection: {
    name: string
    symbol: string
    totalSupply: number
  }
  contractType: string
  owner: string
  media: {
    original: {
      size: number
      mimeType: string
      renderURL: string
    }
    small: {
      size: number
      mimeType: string
      renderURL: string
    }
    medium: {
      size: number
      mimeType: string
      renderURL: string
    }
    allMediaPaths: {
      image: Array<{
        key: string
        value: string
        path: string
      }>
      audio: Array<{
        key: string
        value: string
        path: string
      }>
      video: Array<{
        key: string
        value: string
        path: string
      }>
      other: Array<{
        key: string
        value: string
        path: string
      }>
    }
  }
}

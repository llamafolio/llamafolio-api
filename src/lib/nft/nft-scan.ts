import { environment } from '@environment'
import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import { type Address, getAddress } from 'viem'

const NFTSCAN_BASE_URL = `https://restapi.nftscan.com/api/v2`
const NFTSCAN_API_KEY = environment.NFTSCAN_API_KEY ?? raise('Missing NFTSCAN_API_KEY')
const AUTH_HEADER = { 'X-API-KEY': NFTSCAN_API_KEY }

export const nftScanRequestChain: {
  [chain: string]: string
} = {
  ethereum: 'eth',
  bsc: 'bnb',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  gnosis: 'gnosis',
  avalanche: 'avalanche',
  fantom: 'fantom',
  moonbeam: 'moonbeam',
}

export const nftScanResponseChain: {
  [chain: string]: Chain
} = {
  eth: 'ethereum',
  bsc: 'bsc',
  pls: 'polygon',
  arbi: 'arbitrum',
  opti: 'optimism',
  gnosis: 'gnosis',
  avax: 'avalanche',
  ftm: 'fantom',
  glmr: 'moonbeam',
}

export async function fetchUserNFTs({ address, ercType }: { address: Address; ercType?: 'erc721' | 'erc1155' }) {
  const walletAddress = getAddress(address) ?? raise(`Invalid address: ${address}`)
  const queryParameters = urlSearchParams({
    erc_type: ercType,
    chain: Object.values(nftScanRequestChain).join(';'),
  })
  const url = `${NFTSCAN_BASE_URL}/assets/chain/${walletAddress}?${queryParameters}`
  const data = await fetcher<NftScanAccountNftsResponse | NftScanError>(url, {
    method: 'GET',
    headers: AUTH_HEADER,
  })
  if (data.code !== 200) {
    raise(`[NftScan] error for url ${url}:\n${JSON.stringify(data, undefined, 2)}`)
  }

  return data
}

export async function batchFetchMetadata({
  tokens,
  show_attributes = true,
}: {
  tokens: Array<{ contract_address: string; token_id: string }>
  show_attributes?: boolean
}) {
  const url = `${NFTSCAN_BASE_URL}/assets/batch`
  const response = await fetcher<NftScanMetadataResponse>(url, {
    method: 'POST',
    headers: AUTH_HEADER,
    body: JSON.stringify({
      contract_address_with_token_id_list: tokens,
      show_attributes,
    }),
  })
  if (response.code !== 200) {
    raise(`[NftScan] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

export async function fetchUserNFTCollections({
  address,
  erc_type = 'erc721',
  limit = 100,
  offset = 0,
}: {
  address: string
  erc_type?: 'erc721' | 'erc1155'
  limit?: number
  offset?: number
}) {
  const walletAddress = getAddress(address) ?? raise(`Invalid address: ${address}`)
  const queryParameters = urlSearchParams({
    erc_type,
    limit,
    offset,
  })
  const url = `${NFTSCAN_BASE_URL}/collections/own/${walletAddress}?${queryParameters}`
  const response = await fetcher<NftScanResponse<Array<UserNFTCollection>>>(url, {
    method: 'GET',
    headers: AUTH_HEADER,
  })
  if (response.code !== 200) {
    raise(`[NftScan] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

export async function nftScanAccountStatistics({ address }: { address: Address }) {
  const walletAddress = getAddress(address) ?? raise(`Invalid address: ${address}`)
  const url = `${NFTSCAN_BASE_URL}/statistics/overview/${walletAddress}`
  const response = await fetcher<NftScanAccountStatisticsResponse | NftScanError>(url, {
    method: 'GET',
    headers: AUTH_HEADER,
  })
  if (response.code !== 200) {
    raise(`[NftScan] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }
  return response.data
}

interface NftScanResponse<T> {
  code: number
  msg: string | null
  data: T
}

interface NftScanError extends NftScanResponse<unknown> {}

export interface UserNFTCollection {
  contract_address: Address
  name: string
  symbol: string
  description?: string
  website?: string
  email?: string | null
  twitter?: string
  discord?: string
  telegram?: string | null
  github?: string | null
  instagram?: string
  medium?: string
  logo_url?: string
  banner_url?: string
  featured_url?: string
  large_image_url?: string
  attributes: Array<any>
  erc_type: 'erc721' | 'erc1155'
  deploy_block_number: number
  owner?: Address
  verified: boolean
  opensea_verified: boolean
  royalty: number
  items_total: number
  amounts_total: number
  owners_total: number
  opensea_floor_price?: number
  floor_price?: number
  collections_with_same_name: any
  price_symbol: string
}

interface NftScanMetadataResponse extends NftScanResponse<Array<NftScanMetadata>> {}

export interface NftScanMetadata {
  contract_address: string
  contract_name: string
  contract_token_id: string
  token_id: string
  erc_type: string
  amount: string
  minter: string
  owner: string
  own_timestamp: number
  mint_timestamp: number
  mint_transaction_hash: string
  mint_price: number
  token_uri: string
  metadata_json: string
  name: string
  content_type: string
  content_uri: string
  description: string
  image_uri: string
  external_link: string
  latest_trade_price: any
  latest_trade_symbol: any
  latest_trade_token: any
  latest_trade_timestamp: any
  nftscan_id: string
  nftscan_uri: string
  small_nftscan_uri: string
  attributes: Array<{
    attribute_name: string
    attribute_value: string
    percentage: string
  }>
  rarity_score: number
  rarity_rank: number
}

export interface NftScanAccountStatisticsResponse {
  code: number
  msg: string | null
  data: {
    holding_value: number
    bought_value: number
    sold_value: number
    gas_value: number
    holding_value_usdt: number
    bought_value_usdt: number
    sold_value_usdt: number
    gas_value_usdt: number
    holding_count: number
    mint_count: number
    bought_count: number
    sold_count: number
    send_count: number
    receive_count: number
    burn_count: number
    collection_count: number
  }
}

interface NftScanAccountNftsResponse extends NftScanResponse<Array<NftScanChainCollectionAssets>> {}

interface NftScanChainCollectionAssets {
  chain: string
  exceed_max_items: boolean
  collection_assets: Array<{
    contract_address: string
    contract_name: string
    logo_url: string
    owns_total: number
    items_total: number
    symbol: string
    description: string
    floor_price?: number
    verified: boolean
    opensea_verified: boolean
    assets: Array<NftScanAsset>
  }>
}

interface NftScanAsset {
  contract_address: string
  contract_name: string
  contract_token_id: string
  token_id: string
  erc_type: string
  amount: string
  minter: string
  owner?: string
  own_timestamp?: number
  mint_timestamp: number
  mint_transaction_hash: string
  mint_price?: number
  token_uri: string
  metadata_json: string
  name: string
  content_type: string
  content_uri: string
  description: string
  image_uri: string
  external_link: string
  latest_trade_price?: number
  latest_trade_symbol?: string
  latest_trade_token: any
  latest_trade_timestamp?: number
  nftscan_id: string
  nftscan_uri?: string
  small_nftscan_uri?: string
  attributes: Array<any>
  rarity_score?: number
  rarity_rank?: number
}

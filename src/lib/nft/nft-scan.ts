import { environment } from '@environment'
import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import { type Address, getAddress } from 'viem'

export { fetchUserNFTsFromNftScan, nftScanAccountStatistics }

const NFTSCAN_BASE_URL = `https://restapi.nftscan.com/api/v2`
const NFTSCAN_API_KEY = environment.NFTSCAN_API_KEY ?? raise('Missing NFTSCAN_API_KEY')

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

// nftScanAccountStatistics({
//   address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
// }).then(console.log)

async function nftScanAccountStatistics({ address }: { address: Address }) {
  const walletAddress = getAddress(address) ?? raise(`Invalid address: ${address}`)
  const url = `${NFTSCAN_BASE_URL}/statistics/overview/${walletAddress}`
  const response = await fetcher<NftScanAccountStatisticsResponse | NftScanError>(url, {
    method: 'GET',
    headers: { 'X-API-KEY': NFTSCAN_API_KEY },
  })
  if (response.code !== 200) {
    raise(`[NftScan] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }
  return response.data
}

// fetchUserNFTsFromNftScan({
//   address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
// }).then(console.log)

async function fetchUserNFTsFromNftScan({ address, ercType }: { address: Address; ercType?: 'erc721' | 'erc1155' }) {
  const walletAddress = getAddress(address) ?? raise(`Invalid address: ${address}`)
  const queryParameters = urlSearchParams({
    erc_type: ercType,
    chain: Object.values(nftScanRequestChain).join(';'),
  })
  const url = `${NFTSCAN_BASE_URL}/assets/chain/${walletAddress}?${queryParameters}`
  const data = await fetcher<NftScanAccountNftsResponse | NftScanError>(url, {
    method: 'GET',
    headers: { 'X-API-KEY': NFTSCAN_API_KEY },
  })
  if (data.code !== 200) {
    raise(`[NftScan] error for url ${url}:\n${JSON.stringify(data, undefined, 2)}`)
  }

  return data
}

interface NftScanError {
  code: number
  msg: string
  data?: unknown
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

interface NftScanAccountNftsResponse {
  code: number
  msg: string | null
  data: Array<NftScanChainCollectionAssets>
}

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

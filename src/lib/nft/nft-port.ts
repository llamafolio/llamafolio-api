import environment from '@environment'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import type { Address } from 'viem'
import { getAddress } from 'viem'

const NFTPORT_BASE_URL = 'https://api.nftport.xyz/v0'
const NFTPORT_API_KEY = environment.NFTPORT_API_KEY ?? raise('Missing NFTPORT_API_KEY')

// fetchUserNFTs({
//   address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
// }).then(console.log)

// https://docs.nftport.xyz/reference/retrieve-nfts-owned-by-account
export async function fetchUserNFTs({
  address,
  chain = 'ethereum',
  pageSize = 50,
  continuation,
  contractAddress,
  include = ['metadata', 'file_information', 'contract_information'],
}: {
  address: string
  chain?: 'ethereum' | 'polygon'
  pageSize?: number
  continuation?: string
  contractAddress?: string
  include?: Array<'default' | 'metadata' | 'file_information' | 'contract_information'>
}) {
  const walletAddress = getAddress(address) ?? raise('Invalid address')
  const queryParameters = urlSearchParams({
    chain,
    page_size: pageSize,
    continuation,
    contract_address: contractAddress,
  })
  include.forEach((include) => queryParameters.append('include', include))
  const url = `${NFTPORT_BASE_URL}/accounts/${walletAddress}?${queryParameters}`
  const response = await fetcher<NftPortAccountNftsResponse | NftPortError>(url, {
    method: 'GET',
    headers: { Authorization: NFTPORT_API_KEY },
  })
  if ('code' in response || response.response === 'NOK') {
    raise(`[NftPort] error when calling ${url}:\n ${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

// nftPortListings().then(console.log)

// https://docs.nftport.xyz/reference/retrieve-all-nfts
export async function nftPortListings(
  {
    chain,
    pageSize,
    include,
    continuation,
  }: {
    chain: 'ethereum' | 'polygon'
    pageSize: number
    include: Array<'default' | 'metadata' | 'file_information' | 'contract_information'> | Array<'all'>
    continuation?: string
  } = {
    chain: 'ethereum',
    pageSize: 50,
    include: ['all'],
  },
) {
  const queryParameters = urlSearchParams({
    chain,
    page_size: pageSize.toString(),
    continuation,
  })
  include.forEach((include) => queryParameters.append('include', include))
  const url = `${NFTPORT_BASE_URL}/nfts?${queryParameters}`
  const response = await fetcher<NftPortNftsResponse | NftPortError>(url, {
    method: 'GET',
    headers: { Authorization: NFTPORT_API_KEY },
  })
  if ('code' in response || response.response === 'NOK') {
    raise(`[NftPort] error when calling ${url}:\n ${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

type NftPortError =
  | {
      code: number
      msg: string
    }
  | {
      response: 'NOK'
      error: {
        status_code: number
        code: string
        message: string
      }
    }

interface NftPortNftsResponse {
  response: 'OK'
  nfts: Array<
    {
      chain: 'ethereum' | 'polygon'
    } & NftPortNFT
  >
  continuation: string
}

interface NftPortAccountNftsResponse {
  response: 'OK'
  nfts: Array<NftPortNFT>
  total: number
  continuation: string
}

interface NftPortNFT {
  contract_address: Address
  token_id: string
  name?: string
  description?: string
  file_url?: string
  animation_url?: string
  cached_file_url?: string
  cached_animation_url?: string
  creator_address: string
  metadata?: {
    artist?: string
    aspect_ratio?: number
    collection_name?: string
    curation_status?: string
    description: string
    external_url?: string
    features?: {
      Chance: string
      Chaos: string
      'Colour Set': number
      Force: string
      Mass: string
      Saturation: string
      Symmetry: string
      Turbulence: string
    }
    generator_url?: string
    image: string
    is_static?: boolean
    license?: string
    minted?: boolean
    name?: string
    payout_address?: string
    platform?: string
    project_id?: string
    royaltyInfo?: {
      additionalPayee: string
      additionalPayeePercentage: number
      artistAddress: string
      royaltyFeeByID: number
    }
    script_type?: string
    series?: number
    tokenID?: string
    token_hash?: string
    traits?: Array<{
      trait_type: string
      value: string
    }>
    website?: string
    attributes?: Array<{
      trait_type: string
      value: any
      display_type?: string
    }>
    animation_url?: string
    tokenId?: number
    file_link?: string
    compiler?: string
    iframe_url?: string
    license_terms?: string
    mb1_portrait?: string
    original_image?: string
    sprite_sheet?: string
    vrm?: string
    external_link?: string
  }
  metadata_url?: string
  file_information?: {
    height: number
    width: number
    file_size: number
  }
  contract: {
    name: string
    symbol: string
    type: string
    metadata: any
  }
}

import buffer from 'node:buffer'

import { environment } from '@environment'
import type { Chain } from '@lib/chains'
import { chainById } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'
import type { Address } from 'viem'
import { getAddress } from 'viem'

const INFURA_BASE_URL = `https://nft.api.infura.io`

// fetchUserNFTs({
//   address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
// }).then(console.log)

export async function fetchUserNFTs({ address, chain = 'ethereum' }: { address: Address; chain?: Chain }) {
  const walletAddress = getAddress(address) ?? raise('Invalid address')

  const [API_KEY, API_KEY_SECRET] =
    [environment.INFURA_API_KEY, environment.INFURA_API_KEY_SECRET] ?? raise('Missing INFURA_API_KEY')
  const basicAuthKey = buffer.Buffer.from(`${API_KEY}:${API_KEY_SECRET}`).toString('base64')

  const url = `${INFURA_BASE_URL}/networks/${chainById[chain].chainId}/accounts/${walletAddress}/assets/nfts`
  const response = await fetcher<InfuraAccountNftsResponse | InfuraError>(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${basicAuthKey}`,
    },
  })
  if ('status' in response && response.status !== 200) {
    raise(`[infura] error: for url ${url}: ${response.message}`)
  }

  return response
}

interface InfuraError {
  status: number
  message: string
}

interface InfuraAccountNftsResponse {
  total: number
  pageNumber: number
  pageSize: number
  network: string
  account: string
  cursor: string
  assets: Array<InfuraNFT>
}

interface InfuraNFT {
  contract: string
  tokenId: string
  supply: string
  type: string
  metadata?: {
    name: string
    description?: string
    file_url?: string
    image: string
    attributes?: Array<InfuraNftAttribute>
    custom_fields?: {
      dna: string
      edition: string
      date: number
      compiler: string
    }
    compiler?: string
    animation_url?: string
    external_url?: string
    created_by?: string
    image_details?: {
      bytes: number
      format: string
      sha256: string
      width: number
      height: number
    }
    image_url?: string
    content?: {
      mime: string
    }
    dna?: string
    edition: any
    date?: number
    animation_details?: string
    image_badge?: string
    image_thumbnail?: string
    external_link?: string
    iyk_metadata_version?: string
    collection?: string
    background_color?: string
    power?: string
    seller_fee_basis_points?: number
    is_normalized?: boolean
    name_length?: number
    segment_length?: number
    url?: string
    version?: number
    background_image?: string
    id?: number
    imageHash?: string
    properties: any
    royalty_percentage?: number
    collection_metadata?: string
    mint_channel?: string
    platform?: string
    tokenID?: string
    series?: string
    aspect_ratio?: number
    payout_address?: string
    minted?: boolean
    artist?: string
    script_type?: string
    project_id?: string
    engine_type?: string
    preview_asset_url?: string
    generator_url?: string
    royaltyInfo?: {
      artistAddress: string
      additionalPayee: string
      additionalPayeePercentage: number
      royaltyFeeByID: number
    }
    collection_name?: string
    website?: string
    token_hash?: string
    primary_asset_url?: string
    features?: {
      Palette: string
      Enclosed: boolean
      Ordering: string
      Animation: string
      Direction: string
      'Grid Size': number
      Granularity: string
    }
    traits?: Array<InfuraNftTrait>
    is_static?: boolean
    license?: string
    owner?: string
    home_url?: string
  }
}

interface InfuraNftAttribute {
  trait_type: string
  value: any
  display_type?: string
}

interface InfuraNftTrait {
  trait_type: string
  value: string
}

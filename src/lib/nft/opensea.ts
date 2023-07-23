import environment from '@environment'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'

const OPENSEA_BASE_URL = 'https://api.opensea.io/v2'
const OPENSEA_API_KEY = environment.OPENSEA_API_KEY ?? raise('Missing OPENSEA_API_KEY')

export async function openSeaListings() {
  const response = await fetcher<OpenSeaListings>(`${OPENSEA_BASE_URL}/orders/ethereu/seaport/listing`, {
    headers: { 'X-API-KEY': OPENSEA_API_KEY },
  })
  return response
}

interface OpenSeaListings {
  next: string
  previous: any
  orders: Array<OpenSeaOrder>
}

interface OpenSeaOrder {
  created_date: string
  closing_date: string
  listing_time: number
  expiration_time: number
  order_hash: string
  protocol_data: {
    parameters: {
      offerer: string
      offer: Array<{
        itemType: number
        token: string
        identifierOrCriteria: string
        startAmount: string
        endAmount: string
      }>
      consideration: Array<{
        itemType: number
        token: string
        identifierOrCriteria: string
        startAmount: string
        endAmount: string
        recipient: string
      }>
      startTime: string
      endTime: string
      orderType: number
      zone: string
      zoneHash: string
      salt: string
      conduitKey: string
      totalOriginalConsiderationItems: number
      counter: number
    }
    signature: any
  }
  protocol_address: string
  current_price: string
  maker: {
    user: number
    profile_img_url: string
    address: string
    config: string
  }
  taker: any
  maker_fees: Array<{
    account: {
      user?: number
      profile_img_url: string
      address: string
      config: string
    }
    basis_points: string
  }>
  taker_fees: Array<any>
  side: string
  order_type: string
  cancelled: boolean
  finalized: boolean
  marked_invalid: boolean
  remaining_quantity: number
  relay_id: string
  criteria_proof: any
  maker_asset_bundle: {
    assets: Array<OpenSeaAsset>
    maker: any
    slug: any
    name: any
    description: any
    external_link: any
    asset_contract: any
    permalink: any
    seaport_sell_orders: any
  }
  taker_asset_bundle: {
    assets: Array<OpenSeaAsset>
    maker: any
    slug: any
    name: any
    description: any
    external_link: any
    asset_contract: any
    permalink: any
    seaport_sell_orders: any
  }
}

interface OpenSeaAsset {
  id: number
  token_id: string
  num_sales: number
  background_color: any
  image_url: string
  image_preview_url: string
  image_thumbnail_url: string
  image_original_url: string
  animation_url: any
  animation_original_url: any
  name: string
  description: string
  external_link: any
  asset_contract: {
    address: string
    asset_contract_type: string
    chain_identifier: string
    created_date: string
    name: string
    nft_version: any
    opensea_version: any
    owner: any
    schema_name: string
    symbol: string
    total_supply: any
    description: any
    external_link: any
    image_url: any
    default_to_fiat: boolean
    dev_buyer_fee_basis_points: number
    dev_seller_fee_basis_points: number
    only_proxied_transfers: boolean
    opensea_buyer_fee_basis_points: number
    opensea_seller_fee_basis_points: number
    buyer_fee_basis_points: number
    seller_fee_basis_points: number
    payout_address: any
  }
  permalink: string
  collection: {
    banner_image_url: any
    chat_url: any
    created_date: string
    default_to_fiat: boolean
    description: any
    dev_buyer_fee_basis_points: string
    dev_seller_fee_basis_points: string
    discord_url: any
    display_data: {
      card_display_style: string
      images: Array<any>
    }
    external_url: any
    featured: boolean
    featured_image_url: any
    hidden: boolean
    safelist_request_status: string
    image_url: any
    is_subject_to_whitelist: boolean
    large_image_url: any
    medium_username: any
    name: string
    only_proxied_transfers: boolean
    opensea_buyer_fee_basis_points: string
    opensea_seller_fee_basis_points: number
    payout_address: any
    require_email: boolean
    short_description: any
    slug: string
    telegram_url: any
    twitter_username: any
    instagram_username: any
    wiki_url: any
    is_nsfw: boolean
    fees: {
      seller_fees: Record<string, unknown>
      opensea_fees: {
        '0x0000a26b00c1f0df003000390027140000faa719': number
      }
    }
    is_rarity_enabled: boolean
    is_creator_fees_enforced: boolean
  }
  decimals: number
  token_metadata: any
  is_nsfw: boolean
  owner: any
}

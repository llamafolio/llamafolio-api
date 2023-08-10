import { environment } from '@environment'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'

const CLOUDFLARE_R2_PUBLIC_URL = environment.CLOUDFLARE_R2_PUBLIC_URL ?? raise('Missing CLOUDFLARE_R2_PUBLIC_URL')

export async function defillamaCollections() {
  return fetcher<Array<DefillamaNFTCollection>>(`${CLOUDFLARE_R2_PUBLIC_URL}/nft/llama_nft_collections.json`)
}

export interface DefillamaNFTCollection {
  collectionId: string
  name?: string | null
  symbol?: string | null
  image?: string | null
  totalSupply?: number | null
  onSaleCount?: number | null
  floorPrice?: number | null
  floorPricePctChange1Day?: number | null
  floorPricePctChange7Day?: number | null
}

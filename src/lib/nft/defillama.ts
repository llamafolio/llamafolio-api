import { environment } from '@environment'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'

const CLOUDFLARE_R2_PUBLIC_URL = environment.CLOUDFLARE_R2_PUBLIC_URL ?? raise('Missing CLOUDFLARE_R2_PUBLIC_URL')

// defillamaCollections().then(_ => {
//   console.log(JSON.stringify(_, undefined, 2))
//   console.log(_.length)
// })

export async function defillamaCollections() {
  return fetcher<Array<DefillamaNFTCollection>>(`${CLOUDFLARE_R2_PUBLIC_URL}/nft/llama_nft_collections.json`)
}

export interface DefillamaNFTCollection {
  collectionId: string
  name: string
  symbol: string
  image: string
  totalSupply: number
  onSaleCount: number
  floorPrice: number
  floorPricePctChange1Day: number
  floorPricePctChange7Day: number
}

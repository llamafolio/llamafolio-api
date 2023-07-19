import { environment } from '@environment'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'

const R2_NFT_BUCKET_URL = environment.R2_BUCKET_URL ?? raise('Missing R2_BUCKET_URL')

// defillamaCollections().then(console.log)

export async function defillamaCollections() {
  return fetcher<DefillamaCollectioons>(`${R2_NFT_BUCKET_URL}/llamafolio/nft/collections.json`)
}

type DefillamaCollectioons = Array<DefillamaNFTCollection>

interface DefillamaNFTCollection {
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

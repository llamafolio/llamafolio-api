import { raise } from '@lib/error'

export async function nftCollections() {
  const response = await fetch('https://nft.llama.fi/collections')
  if (!response.ok) {
    raise(`${response.status} - Failed to fetch from Defillama: ${response.statusText}`)
  }
  const data = (await response.json()) as NFTCollection[]
  return data
}

interface NFTCollection {
  contractAddress: string
  name: string
  symbol: string
  image: string
  totalSupply: number
  onSaleCount: number
  floorPrice: number
  floorPricePctChange1Day: number
  floorPricePctChange7Day: number
}

import { selectNFTBalances } from '@db/balances'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { groupBy, keyBy } from '@lib/array'
import type { Chain } from '@lib/chains'
import { parseAddresses } from '@lib/fmt'
import { fetchNFTCollections } from '@lib/nft'
import { decodeNFTMetadata, type NFTMetadata } from '@lib/nft/metadata'
import { getTokenPrice } from '@lib/price'
import { ETH } from '@lib/token'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface NFT {
  floorPrice?: number
  address: `0x${string}`
  chain: string
  id: string
  holder: `0x${string}`
  amount: number
  metadata?: NFTMetadata
}

interface NFTsResponse {
  count: number
  floorPrice?: number
  data: NFT[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const addresses = parseAddresses(event.pathParameters?.address || '')
    if (addresses.length === 0) {
      return badRequest('Invalid address parameter')
    }

    const [ethPriceRes, nftBalances, nftCollections] = await Promise.all([
      getTokenPrice(ETH),
      selectNFTBalances(client, addresses),
      fetchNFTCollections(),
    ])

    const nftBalancesByChain = groupBy(nftBalances, 'chain')
    // Fetch NFTs Metadata
    await Promise.all(
      Object.keys(nftBalancesByChain).map(async (chain) => {
        const ctx: BaseContext = { chain: chain as Chain, adapterId: 'wallet' }
        return decodeNFTMetadata(ctx, nftBalancesByChain[chain] || [])
      }),
    )

    let totalFloorPrice
    // group NFTs by collections
    const nftCollectionById = keyBy(nftCollections, 'collectionId', { lowercase: true })
    const data: NFT[] = []

    for (const nftBalance of nftBalances) {
      const collection = nftCollectionById[nftBalance.address]
      if (collection?.floorPrice && ethPriceRes?.price) {
        ;(nftBalance as NFT).floorPrice = collection.floorPrice * ethPriceRes.price
      }
      data.push(nftBalance as NFT)
    }

    const response: NFTsResponse = {
      floorPrice: totalFloorPrice,
      count: nftBalances.length,
      data,
    }

    return success(response, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to fetch user NFTs', { error })
    return serverError('Failed to fetch user NFTs')
  }
}

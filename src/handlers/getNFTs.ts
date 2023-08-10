import { badRequest, serverError, success } from '@handlers/response'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { ADDRESS_ZERO } from '@lib/contract'
import { paginatedFetch } from '@lib/fetcher'
import type { DefillamaNFTCollection } from '@lib/nft'
import { defillamaCollections, fetchNFTMetadataFrom, fetchUserNFTsFrom } from '@lib/nft'
import { fetchTokenPrices } from '@lib/price'
import { isFulfilled } from '@lib/promise'
import type { AwaitedReturnType, Json } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { Address } from 'viem'
import { isAddress } from 'viem'

import type { Chain } from '@/lib/chains'

interface NFT {
  tokenId: string
  address: Address
  quantity: number
  name?: string
  image?: string
  description?: string
  externalUrl?: string
  attributes?: Array<Json>
  metadata?: Json
}

interface UserNFTItem {
  collection?: DefillamaNFTCollection
  minimumValueUSD?: number | null
  quantity: number
  nfts: Array<NFT>
}

interface UserNFTsResponse {
  walletAddress: Address
  quantity: number
  minimumValueUSD?: number | null
  data: Array<UserNFTItem>
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  try {
    const address = event.pathParameters?.address
    if (!address) {
      return badRequest('Missing address parameter')
    }
    if (!isAddress(address)) {
      return badRequest('Invalid address parameter, expected hex')
    }
    const response = await nftsHandler({ address })

    return success(response, { maxAge: 30 * 60 })
  } catch (error) {
    console.error('Failed to fetch user NFTs', { error })
    return serverError('Failed to fetch user NFTs')
  } finally {
    console.log('NFTs request took', context.getRemainingTimeInMillis() / 1000, 'seconds')
  }
}

async function tokensPrice(ids: Array<`${Chain}:${Address}`>) {
  const result = await fetchTokenPrices(ids)
  return Object.entries(result.coins).reduce(
    (_, [key, { price }]) => {
      const [, address] = key.split(':')
      return { address, price } as { address: Address; price: number }
    },
    {} as { address: Address; price: number },
  )
}

// TODO: add rate limit checker
const rateLimitReached = true

export async function getUserNFTs(address: Address) {
  if (rateLimitReached) {
    const userNFTsResponse = await paginatedFetch({
      fn: fetchUserNFTsFrom.alchemy<false>,
      initialParams: {
        address,
        pageSize: 100,
        chain: 'ethereum',
        withMetadata: false,
        spamConfidenceLevel: 'LOW',
      },
      iterations: 10,
      pageKeyProp: 'pageKey',
    })
    const userNFTs = userNFTsResponse.flatMap((response) => response.ownedNfts)

    return userNFTs
      .map((nft) => ({
        id: `${nft.contractAddress}:${nft.tokenId}`.toLowerCase(),
        address: nft.contractAddress,
        tokenId: nft.tokenId,
        quantity: Number(nft.balance),
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  }
  const userNFTsResponse = await fetchUserNFTsFrom.center({ address })
  return userNFTsResponse.items
    .map((nft) => ({
      id: `${nft.address}:${nft.tokenID}`.toLowerCase(),
      address: nft.address,
      tokenId: nft.tokenID,
      quantity: nft.quantity,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function getNFTsMetadata({
  nfts,
  maxBatchSize = 50,
}: {
  nfts: Array<{
    address: string
    tokenId: string
  }>
  maxBatchSize?: number
}): Promise<{
  [key: string]: any
}> {
  const chunks = sliceIntoChunks(nfts, maxBatchSize)

  const metadataPromiseResult = await Promise.allSettled(
    chunks.map((chunk) =>
      fetchNFTMetadataFrom.quickNode(
        chunk.map((nft) => ({ contractAddress: nft.address, tokenId: nft.tokenId, chain: 'ethereum' })),
      ),
    ),
  )

  const metadataFulfilledResults = (
    metadataPromiseResult.filter((result) => isFulfilled(result)) as PromiseFulfilledResult<
      AwaitedReturnType<typeof fetchNFTMetadataFrom.quickNode>
    >[]
  ).flatMap((item) => Object.values(item.value))

  return metadataFulfilledResults.reduce((accumulator, { nft: metadata }) => {
    const id = `${metadata?.contractAddress}:${metadata?.tokenId}`.toLowerCase()
    return { ...accumulator, [id]: metadata }
  }, {})
}

export async function nftsHandler({ address }: { address: Address }): Promise<UserNFTsResponse> {
  const { price: ethPrice } = await tokensPrice([`ethereum:${ADDRESS_ZERO}`])

  const userNFTs = await getUserNFTs(address)

  const nftsMetadata = await getNFTsMetadata({
    nfts: userNFTs.map((nft) => ({ address: nft.address, tokenId: nft.tokenId })),
  })

  const mergedNFTs = userNFTs.map((nft) => {
    const { metadata, ...rest } = nftsMetadata[nft.id] || {}
    return { ...nft, ...metadata, ...rest }
  })

  const result: {
    [collectionId: string]: UserNFTItem
  } = {}

  const nftsGroupedByContract = groupBy(mergedNFTs, 'contractAddress')

  const collectionsMarketData = await defillamaCollections()
  const collectionsMarketDataGroupedByAddress = collectionsMarketData.reduce(
    (accumulator, collection) => {
      accumulator[collection.collectionId] = collection
      return accumulator
    },
    {} as Record<string, DefillamaNFTCollection>,
  )

  for (const [address, nfts] of Object.entries(nftsGroupedByContract)) {
    if (!address || address == 'undefined') continue
    const collection = collectionsMarketDataGroupedByAddress[address]
    if (!collection) {
      console.log(`Collection not found for ${address}`)
      result[address] = {
        collection: {
          collectionId: address,
        },
        quantity: nfts.length,
        nfts,
      }
      continue
    }

    const floorPrice = collection.floorPrice
    const minimumValueUSD = floorPrice ? floorPrice * nfts.length * ethPrice : undefined

    result[collection.collectionId || address] = {
      collection,
      quantity: nfts.length,
      minimumValueUSD,
      nfts,
    }
  }

  const minimumValueUSD = Object.values(result).reduce(
    (accumulator, collection) => accumulator + (collection.minimumValueUSD ?? 0),
    0,
  )

  return {
    walletAddress: address,
    quantity: userNFTs.length,
    minimumValueUSD,
    data: Object.values(result),
  }
}

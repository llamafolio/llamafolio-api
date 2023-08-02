import { badRequest, serverError, success } from '@handlers/response'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { ADDRESS_ZERO } from '@lib/contract'
import { paginatedFetch } from '@lib/fetcher'
import { parseStringJSON } from '@lib/fmt'
import type { DefillamaNFTCollection } from '@lib/nft'
import { defillamaCollections, fetchNFTMetadataFrom, fetchUserNFTCollectionsFrom, fetchUserNFTsFrom } from '@lib/nft'
import type { NftScanMetadata as NFTMetadata, UserNFTCollection } from '@lib/nft/nft-scan'
import { fetchTokenPrices } from '@lib/price'
import { isFulfilled } from '@lib/promise'
import type { AwaitedReturnType } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { Address } from 'viem'
import { isAddress } from 'viem'

import type { Chain } from '@/lib/chains'

interface UserNFTItem {
  collection?: UserNFTCollection & DefillamaNFTCollection
  minimumValueUSD?: number | null
  quantity: number
  nfts: Array<NFTMetadata>
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
        tokenID: nft.tokenId,
        quantity: Number(nft.balance),
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  const userNFTsResponse = await fetchUserNFTsFrom.center({ address })
  return userNFTsResponse.items
    .map((nft) => ({
      id: `${nft.address}:${nft.tokenID}`.toLowerCase(),
      address: nft.address,
      tokenID: nft.tokenID,
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
    tokenID: string
  }>
  maxBatchSize?: number
}) {
  const chunks = sliceIntoChunks(nfts, maxBatchSize)
  const metadataPromiseResult = await Promise.allSettled(
    chunks.map((chunk) =>
      fetchNFTMetadataFrom.nftScan({
        tokens: chunk.map((nft) => ({ contract_address: nft.address, token_id: nft.tokenID })),
        show_attributes: true,
      }),
    ),
  )
  const metadataFulfilledResults = (
    metadataPromiseResult.filter((result) => isFulfilled(result)) as PromiseFulfilledResult<
      AwaitedReturnType<typeof fetchNFTMetadataFrom.nftScan>
    >[]
  ).flatMap((item) => item.value.data)

  const flattenedMetadata = metadataFulfilledResults
    .map((metadata) => ({
      ...metadata,
      metadata_json: parseStringJSON(metadata.metadata_json),
      id: `${metadata.erc_type}:${metadata.contract_address}:${metadata.token_id}`.toLowerCase(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  return flattenedMetadata
}

export async function nftsHandler({ address }: { address: Address }): Promise<UserNFTsResponse> {
  const { price: ethPrice } = await tokensPrice([`ethereum:${ADDRESS_ZERO}`])

  const userNFTs = await getUserNFTs(address)

  const nftsMetadata = await getNFTsMetadata({
    nfts: userNFTs.map((nft) => ({ address: nft.address, tokenID: nft.tokenID })),
  })

  const mergedNFTs = userNFTs.map((nft, index) => {
    const metadata = nftsMetadata[index]

    return { ...nft, ...metadata }
  })

  const { erc1155, erc721 } = mergedNFTs.reduce(
    (accumulator, item) => {
      item.erc_type === 'erc1155' ? accumulator.erc1155.push(item) : accumulator.erc721.push(item)
      return accumulator
    },
    { erc721: [], erc1155: [] } as { erc721: Array<(typeof mergedNFTs)[0]>; erc1155: Array<(typeof mergedNFTs)[0]> },
  )

  const erc721ChunksCount = Math.ceil(erc721.length / 100)
  const erc1155ChunksCount = Math.ceil(erc1155.length / 100)

  const collectionsPromiseResult = await Promise.allSettled([
    ...Array.from({ length: erc721ChunksCount }, (_, index) =>
      fetchUserNFTCollectionsFrom.nftScan({ address, erc_type: 'erc721', limit: 100, offset: index * 100 }),
    ),
    ...Array.from({ length: erc1155ChunksCount }, (_, index) =>
      fetchUserNFTCollectionsFrom.nftScan({ address, erc_type: 'erc1155', limit: 100, offset: index * 100 }),
    ),
  ])

  const collections = (
    collectionsPromiseResult.filter((result) => isFulfilled(result)) as PromiseFulfilledResult<
      AwaitedReturnType<typeof fetchUserNFTCollectionsFrom.nftScan>
    >[]
  ).flatMap((item) => item.value.data)

  const collectionsGroupedByAddress = collections.reduce(
    (accumulator, collection) => {
      accumulator[collection.contract_address] = collection
      return accumulator
    },
    {} as Record<string, UserNFTCollection>,
  )

  const result: {
    [collectionId: string]: UserNFTItem
  } = {}

  const collectionless: Array<NFTMetadata> = []

  const nftsGroupedByContract = groupBy(mergedNFTs, 'contract_address')

  const collectionsMarketData = await defillamaCollections()
  const collectionsMarketDataGroupedByAddress = collectionsMarketData.reduce(
    (accumulator, collection) => {
      accumulator[collection.collectionId] = collection
      return accumulator
    },
    {} as Record<string, DefillamaNFTCollection>,
  )

  for (const [address, nfts] of Object.entries(nftsGroupedByContract)) {
    const collection = collectionsGroupedByAddress[address]
    if (!collection) {
      collectionless.push(...nfts)
      continue
    }

    const collectionMarketData = collectionsMarketDataGroupedByAddress[address]

    const floorPrice = collection?.floor_price ?? collectionMarketData?.floorPrice
    const minimumValueUSD = floorPrice ? floorPrice * ethPrice * nfts.length : undefined

    result[collection.contract_address] = {
      collection: { ...collection, ...collectionMarketData },
      quantity: nfts.length,
      minimumValueUSD,
      nfts,
    }
  }

  result['unknown'] = {
    collection: undefined,
    quantity: collectionless.length,
    nfts: collectionless,
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

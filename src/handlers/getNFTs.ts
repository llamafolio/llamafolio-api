import { badRequest, serverError, success } from '@handlers/response'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { parseStringJSON } from '@lib/fmt'
import { sum } from '@lib/math'
import { fetchNFTMetadataFrom, fetchUserNFTCollectionsFrom, fetchUserNFTsFrom } from '@lib/nft'
import type { NftScanMetadata as NFTMetadata } from '@lib/nft/nft-scan'
import type { UserNFTCollection } from '@lib/nft/reservoir'
import { isFulfilled } from '@lib/promise'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { Address } from 'viem'
import { isAddress } from 'viem'

interface UserNFTsResponse {
  walletAddress: Address
  quantity: number
  minimumValueUSD?: number | null
  data: Array<{
    collection?: UserNFTCollection['collection']
    minimumValueUSD?: number | null
    quantity: number
    nfts: Array<NFTMetadata>
  }>
}

export async function nftsHandler({ address }: { address: Address }): Promise<UserNFTsResponse> {
  const nftsResponse = await fetchUserNFTsFrom.center({ address })

  const chunks = sliceIntoChunks(nftsResponse.items, 50)
  const metadataPromiseResult = await Promise.allSettled(
    chunks.map((chunk) =>
      fetchNFTMetadataFrom.nftScan({
        tokens: chunk.map((nft) => ({ contract_address: nft.address, token_id: nft.tokenID })),
      }),
    ),
  )
  const metadataFulfilledResults = (
    metadataPromiseResult.filter((result) => isFulfilled(result)) as PromiseFulfilledResult<
      Awaited<ReturnType<typeof fetchNFTMetadataFrom.nftScan>>
    >[]
  ).flatMap((item) => item.value)

  const flattenedMetadata = metadataFulfilledResults.flatMap(({ data }) =>
    data.map((metadata) => ({
      ...metadata,
      metadata_json: parseStringJSON(metadata.metadata_json),
    })),
  )

  const mergedNFTs = nftsResponse.items.map((nft, index) => ({ ...nft, ...flattenedMetadata[index] }))
  const nftsGroupedByContract = groupBy(mergedNFTs, 'address')

  const collections = await fetchUserNFTCollectionsFrom.reservoir({ user: address, limit: 100 })

  const collectionsGroupedByAddress = collections.collections.reduce((accumulator, { collection, ownership }) => {
    accumulator[collection.id] = { collection, ownership }
    return accumulator
  }, {} as Record<string, UserNFTCollection>)

  const result: {
    [collectionId: string]: {
      collection?: UserNFTCollection['collection']
      minimumValueUSD?: number | null
      quantity: number
      nfts: Array<NFTMetadata>
    }
  } = {}
  const collectionless: Array<NFTMetadata> = []

  for (const [address, nfts] of Object.entries(nftsGroupedByContract)) {
    const collectionInfo = collectionsGroupedByAddress[address]
    const collection = collectionInfo?.collection ?? null
    const ownership = collectionInfo?.ownership ?? null
    if (!collection) {
      collectionless.push(...nfts)
      continue
    }

    const minimumValueUSD = collection?.floorAskPrice?.amount?.usd
      ? Number(ownership?.tokenCount) * collection?.floorAskPrice?.amount?.usd
      : null

    result[collection.id] = {
      collection,
      quantity: Number(ownership?.tokenCount) ?? nfts.length,
      minimumValueUSD,
      nfts,
    }
  }

  result['unknown'] = {
    collection: undefined,
    quantity: collectionless.length,
    nfts: collectionless,
  }

  const minimumValueUSD = sum(Object.values(result).map((collection) => collection.minimumValueUSD ?? 0))

  return {
    walletAddress: address,
    quantity: nftsResponse.items.length,
    minimumValueUSD,
    data: Object.values(result),
  }
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
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

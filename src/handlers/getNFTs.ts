import { serverError, success } from '@handlers/response'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { raise } from '@lib/error'
import { sum } from '@lib/math'
import { fetchNFTMetadataFrom, fetchUserNFTCollectionsFrom, fetchUserNFTsFrom } from '@lib/nft'
import type { UserNFTCollection } from '@lib/nft/reservoir'
import { isNotFalsy } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { getAddress, isAddress } from 'viem'

export function parseStringJSON(jsonString: string) {
  try {
    if (!isNotFalsy(jsonString)) return jsonString
    return JSON.parse(
      jsonString
        .replaceAll('\n', '')
        .replaceAll('\\n', '')
        .replaceAll('\r', '')
        .replaceAll('\t', '')
        .replaceAll('\\', ''),
    )
  } catch (error) {
    console.error('Failed to parse JSON', { string: jsonString, error })
    return jsonString
  }
}

/**
 * Get NFTs from Center,
 * batch get NFT details from NFTScan,
 */

export const handler: APIGatewayProxyHandler = async (event, _) => {
  try {
    const address = getAddress(event.pathParameters?.address ?? raise('Missing wallet address from URL address'))
    if (!isAddress(address)) raise(`Invalid wallet address: ${address}`)

    const nftsResponse = await fetchUserNFTsFrom.center({ address })

    const chunks = sliceIntoChunks(nftsResponse.items, 50)
    const metadataResponse = await Promise.all(
      chunks.map((chunk) =>
        fetchNFTMetadataFrom.nftScan({
          tokens: chunk.map((nft) => ({ contract_address: nft.address, token_id: nft.tokenID })),
        }),
      ),
    )

    const flattenedMetadata = metadataResponse.flatMap(({ data }) =>
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
        nfts: Awaited<ReturnType<(typeof fetchNFTMetadataFrom)['nftScan']>>['data']
      }
    } = {}
    const collectionless: Awaited<ReturnType<(typeof fetchNFTMetadataFrom)['nftScan']>>['data'] = []

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
      quantity: collectionless.length,
      nfts: collectionless,
    }

    const minimumValueUSD = sum(Object.values(result).map((collection) => collection.minimumValueUSD ?? 0))

    return success(
      {
        walletAddress: address,
        quantity: nftsResponse.items.length,
        minimumValueUSD,
        data: Object.values(result),
      },
      { maxAge: 30 * 60 },
    )
  } catch (error) {
    console.error('Failed to fetch user NFTs', { error })
    return serverError('Failed to fetch user NFTs')
  }
}

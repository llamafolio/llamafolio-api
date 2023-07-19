import { serverError, success } from '@handlers/response'
import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { paginatedFetch } from '@lib/fetcher'
import { defillamaCollections, fetchUserNFTsFromAlchemy } from '@lib/nft'
import { BLACKLISTED_TRASH } from '@lib/nft/blacklist'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { Address } from 'viem'
import { getAddress, isAddress } from 'viem'

export const handler: APIGatewayProxyHandler = async (event, _) => {
  try {
    const address = getAddress(event.pathParameters?.address ?? raise('Missing wallet address from URL address'))
    if (!isAddress(address)) raise(`Invalid wallet address: ${address}`)

    const response = {} as any // WIP

    const results = await paginatedFetch({
      fn: fetchUserNFTsFromAlchemy,
      initialParams: { address },
      iterations: 3,
    })

    const [{ totalCount: totalNftCount }] = results

    response['quantity'] = totalNftCount
    const allNFTs = results.flatMap((result) =>
      result.ownedNfts.filter((item) => !BLACKLISTED_TRASH.includes(item.contract.address.toLowerCase())),
    )

    const collectionsData = await defillamaCollections()

    const groupedByCollection: {
      [collectionId: string]: { nfts: any[] }
    } = {}

    for (const nft of allNFTs) {
      const collection = collectionsData.find(
        (collection) => collection.collectionId.toLowerCase() === nft.contract.address.toLowerCase(),
      )

      if (!collection || !collection.collectionId) {
        if (!groupedByCollection['']) groupedByCollection[''] = { nfts: [] }
        groupedByCollection[''].nfts.push(nft)
        continue
      }

      if (!groupedByCollection[collection.collectionId]) {
        groupedByCollection[collection.collectionId] = {
          ...collection,
          nfts: [],
        }
      }

      groupedByCollection[collection.collectionId].nfts.push(nft)
    }

    return success(
      {
        walletAddress: address,
        totalValue: 0, // TODO
        quantity: totalNftCount,
        collections: groupedByCollection,
      },
      { maxAge: 30 * 60 },
    )
  } catch (error) {
    console.error('Failed to fetch user NFTs', { error })
    return serverError('Failed to fetch user NFTs')
  }
}

interface NftResponse {
  walletAddress: Address
  totalValue: number
  quantity: number
  nfts: Array<{
    network: Chain
    address: Address
    tokenId: string
    name: string
    description: string
    media: Array<string>
    estimatedValue: number
    rarity: number
    traits: Array<[['name', string], ['value', string]]>
    history: Record<string, any>
    quantity: number
    collection: {
      chain: Chain
      address: Address
      name: string
      description: string
      type: 'ERC721' | 'ERC1155'
      media: Array<string>
      symbol: string
      links: Array<[['name', string], ['url', string]]>
    }
  }>
}

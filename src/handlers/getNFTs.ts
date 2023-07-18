import { serverError, success } from '@handlers/response'
import { raise } from '@lib/error'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { getAddress, isAddress } from 'viem'

import * as nfts from '@/lib/nft'

export const handler: APIGatewayProxyHandler = async (event, _) => {
  try {
    const address = getAddress(event.pathParameters?.address ?? raise('Missing wallet address from URL address'))
    if (!isAddress(address)) raise(`Invalid wallet address: ${address}`)

    const userNFTs = await Promise.all(
      nfts.sequenceSupportedChains.map(async (chain) => {
        const response = await nfts.fetchUserNFTsFromSequence({
          address,
          chain,
        })
        return response.nfts
      }),
    )

    const allNFTs = userNFTs.flat()

    return success({ address, nfts: allNFTs }, { maxAge: 30 * 60 })
  } catch (error) {
    console.error('Failed to fetch user NFTs', { error })
    return serverError('Failed to fetch user NFTs')
  }
}

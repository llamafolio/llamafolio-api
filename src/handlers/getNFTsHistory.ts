import { badRequest, serverError, success } from '@handlers/response'
import { sliceIntoChunks } from '@lib/array'
import { fetchNFTTradingHistoryFrom } from '@lib/nft'
import type { QuickNodeChain } from '@lib/nft/quick-node'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { isAddress } from 'viem'

/**
 * Takes array of nft tokens (contractAddress, tokenId, chain) and returns trading history for each token
 */
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

    const body = JSON.parse(event.body ?? '[{}]') as Array<{
      contractAddress: string
      tokenId: string
      chain: QuickNodeChain
    }>

    if (!Array.isArray(body)) {
      return badRequest('Invalid body parameter, expected array')
    }

    const chunks = sliceIntoChunks(body, 100)

    const promisesResponse = await Promise.all(chunks.map((chunk) => fetchNFTTradingHistoryFrom.quickNode(chunk)))
    const response = promisesResponse.flat()

    return success(response, { maxAge: 30 * 60 })
  } catch (error) {
    console.error('Failed to fetch NFTs trading history', { error })
    return serverError('Failed to fetch NFTs trading history')
  } finally {
    console.log('NFTs trading history request took', context.getRemainingTimeInMillis() / 1000, 'seconds')
  }
}

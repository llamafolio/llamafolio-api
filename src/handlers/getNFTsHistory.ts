import { badRequest, serverError, success } from '@handlers/response'
import { sliceIntoChunks } from '@lib/array'
import { fetchNFTTradingHistoryFrom, fetchUserNFTActivityFrom } from '@lib/nft'
import type { QuickNodeChain, QuickNodeTokenEvent } from '@lib/nft/quick-node'
import type { NFTActivity } from '@lib/nft/reservoir'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { isAddress } from 'viem'

interface NFTTokenActivity {
  type: string
  marketplace?: string
  fromAddress: string
  toAddress?: string
  amount?: number
  blockNumber?: number
  timestamp: string
  contractAddress?: string
  tokenId?: string | number
  transactionHash?: string
}

async function history(address: string, body: string | null) {
  try {
    // try reservoir first, if it fails, try quicknode
    const userNFTActivity = await fetchUserNFTActivityFrom.reservoir({ users: [address], includeMetadata: false })
    return formatNFTReservoirTokenEvents(userNFTActivity.activities)
  } catch (error) {
    const payload = JSON.parse(body ?? '[{}]') as Array<{
      contractAddress: string
      tokenId: string
      chain: QuickNodeChain
    }>
    if (!Array.isArray(payload)) return badRequest('Invalid body parameter, expected array')
    const chunks = sliceIntoChunks(payload, 100)
    const promisesResponse = await Promise.all(chunks.map((chunk) => fetchNFTTradingHistoryFrom.quickNode(chunk)))
    const response = promisesResponse.flat()

    return formatNFTQuickNodeTokenEvents(
      response
        .map((events) => {
          const [[, { nft }]] = Object.entries(events)
          return nft.QuickNodeTokenEvents.edges.map((edge) => edge.node)
        })
        .flat(),
    )
  }
}

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

    const response = await history(address, event.body)

    return success(response, { maxAge: 30 * 60 })
  } catch (error) {
    console.error('Failed to fetch NFTs trading history', { error })
    return serverError('Failed to fetch NFTs trading history')
  } finally {
    console.log('NFTs trading history request took', context.getRemainingTimeInMillis() / 1000, 'seconds')
  }
}

export function formatNFTQuickNodeTokenEvents(tokenEvents: Array<QuickNodeTokenEvent>): Array<NFTTokenActivity> {
  return tokenEvents.map((event) => {
    const {
      type,
      fromAddress,
      toAddress,
      timestamp,
      transactionHash,
      blockNumber,
      marketplace,
      contractAddress,
      tokenId,
      receivedTokenId,
      sentTokenId,
      tokenQuantity,
      sentTokenQuantity,
    } = event
    return {
      type,
      marketplace,
      fromAddress,
      toAddress,
      amount: tokenQuantity ?? sentTokenQuantity,
      blockNumber,
      timestamp,
      contractAddress,
      tokenId: tokenId ?? sentTokenId ?? receivedTokenId,
      transactionHash,
    }
  })
}

export function formatNFTReservoirTokenEvents(activities: Array<NFTActivity>): Array<NFTTokenActivity> {
  return activities.map((activity) => {
    const {
      type,
      fromAddress,
      toAddress,
      timestamp,
      txHash,
      contract,
      token: { tokenId },
    } = activity
    return {
      type,
      fromAddress,
      toAddress,
      timestamp: new Date(timestamp).toISOString(),
      contractAddress: contract,
      tokenId,
      transactionHash: txHash,
    }
  })
}

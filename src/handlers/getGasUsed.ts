import { client } from '@db/clickhouse'
import { selectGasUsed } from '@db/gasUsed'
import { badRequest, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface GasUsedResponse {
  data: {
    totalGasUsed: number
    transactionCount: number
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (!address) {
    return badRequest('Invalid address parameter')
  }

  const chainId = getChainId(event.queryStringParameters?.chain || 'ethereum')
  if (chainId == null) {
    return badRequest(`Unknown chain ${event.queryStringParameters?.chain}`)
  }

  try {
    const data = await selectGasUsed(client, chainId, address)

    const response: GasUsedResponse = { data }

    return success(response, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to gas used', { error })
    return serverError('Failed to get gas used')
  }
}

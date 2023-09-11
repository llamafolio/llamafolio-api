import { badRequest, serverError, success } from '@handlers/response'
import { fetchLabels } from '@labels/defillama'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get labels of given address
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address?.toLowerCase() as `0x${string}`
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const defiLlamaLabels = await fetchLabels(address)

    return success({ labels: defiLlamaLabels, links: [] }, { maxAge: 60 * 60, swr: 20 * 60 })
  } catch (error) {
    console.error('Failed to retrieve labels', { error, address })
    return serverError('Failed to retrieve labels')
  }
}

import { badRequest, serverError, success } from '@handlers/response'
import { fetchLabels } from '@labels/defillama'
import { isHex } from '@lib/contract'
import { parseAddresses } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get labels of given address
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Missing address parameter')
  }

  if (addresses.some((address) => !isHex(address))) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const defiLlamaLabels = await fetchLabels(addresses)

    return success({ labels: defiLlamaLabels, links: [] }, { maxAge: 60 * 60, swr: 20 * 60 })
  } catch (error) {
    console.error('Failed to retrieve labels', { error, addresses })
    return serverError('Failed to retrieve labels')
  }
}

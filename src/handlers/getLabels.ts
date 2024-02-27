import { badRequest, serverError, success } from '@handlers/response'
import { fetchLabels } from '@labels/defillama'
import type { BalancesContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { parseAddresses } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get labels of given address
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Invalid address parameter')
  }

  try {
    const defiLlamaLabels = await fetchLabels(addresses)

    return success({ labels: defiLlamaLabels, links: [] }, { maxAge: 60 * 60, swr: 20 * 60 })
  } catch (error) {
    console.error('Failed to retrieve labels', { error, addresses })

    await Promise.all(
      addresses.map(async (address) => {
        const balancesContext: BalancesContext = {
          chain: 'ethereum',
          adapterId: '',
          client: getRPCClient({ chain: 'ethereum' }),
          address,
        }

        await sendSlackMessage(balancesContext, {
          level: 'error',
          title: 'Failed to retrieve labels',
          message: (error as any).message,
        })
      }),
    )

    return serverError('Failed to retrieve labels')
  }
}

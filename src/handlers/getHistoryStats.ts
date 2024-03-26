import { client } from '@db/clickhouse'
import { type HistoryStat, selectHistoryStats } from '@db/history'
import { badRequest, forbidden, serverError, success } from '@handlers/response'
import type { BalancesContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { parseAddresses } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface HistoryStatsResponse {
  data: HistoryStat[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.headers.origin !== 'https://llamafolio.com') {
    return forbidden('Forbidden')
  }

  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Invalid address parameter')
  }

  const year = parseInt(event.queryStringParameters?.year || '') || new Date().getFullYear()

  try {
    const data = await selectHistoryStats(client, addresses, year)

    const historyStatsResponse: HistoryStatsResponse = {
      data,
    }

    return success(historyStatsResponse, { maxAge: 60 * 60, swr: 20 * 60 })
  } catch (error) {
    console.error('Failed to retrieve history stats', { error, addresses })

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
          title: 'Failed to retrieve history stats',
          message: (error as any).message,
        })
      }),
    )

    return serverError('Failed to retrieve history stats', { error, addresses })
  }
}

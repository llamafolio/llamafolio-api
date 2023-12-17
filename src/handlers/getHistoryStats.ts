import { client } from '@db/clickhouse'
import { type HistoryStat, selectHistoryStats } from '@db/history'
import { badRequest, serverError, success } from '@handlers/response'
import { parseAddresses } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface HistoryStatsResponse {
  data: HistoryStat[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
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

    return success(historyStatsResponse)
  } catch (error) {
    console.error('Failed to retrieve history stats', { error, addresses })
    return serverError('Failed to retrieve history stats', { error, addresses })
  }
}

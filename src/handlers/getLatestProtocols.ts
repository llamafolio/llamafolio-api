import { selectLatestCreatedAdapters } from '@db/adapters'
import pool from '@db/pool'
import { serverError, success } from '@handlers/response'
import { Chain } from '@lib/chains'
import { APIGatewayProxyHandler } from 'aws-lambda'

interface ProtocolResponse {
  id: string
  chains: Chain[]
  createdAt: string
}

interface LatestProtocolsResponse {
  protocols: ProtocolResponse[]
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters?.limit) : undefined

    const latestCreatedProtocols = await selectLatestCreatedAdapters(client, limit)

    const response: LatestProtocolsResponse = {
      protocols: latestCreatedProtocols.map((protocol) => ({
        id: protocol.id,
        chains: protocol.chains,
        createdAt: protocol.createdAt.toISOString(),
      })),
    }

    return success(response, { maxAge: 10 * 60 })
  } catch (e) {
    console.error('Failed to retrieve latest protocols', e)
    return serverError('Failed to retrieve latest protocols')
  } finally {
    client.release(true)
  }
}

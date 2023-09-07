import { selectLatestCreatedAdapters } from '@db/adapters'
import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import type { Chain } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface ProtocolResponse {
  id: string
  chains: Chain[]
  createdAt: string
}

interface LatestProtocolsResponse {
  protocols: ProtocolResponse[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
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
  } catch (error) {
    console.error('Failed to retrieve latest protocols', error)
    return serverError('Failed to retrieve latest protocols', { error })
  }
}

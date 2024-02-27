import { selectLatestCreatedAdapters } from '@db/adapters'
import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { type Chain, getRPCClient } from '@lib/chains'
import { sendSlackMessage } from '@lib/slack'
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
  const baseContext: BaseContext = { chain: 'ethereum', adapterId: '', client: getRPCClient({ chain: 'ethereum' }) }

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
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to retrieve latest protocols',
      message: (error as any).message,
    })
    return serverError('Failed to retrieve latest protocols', { error })
  }
}

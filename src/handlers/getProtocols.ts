import { client } from '@db/clickhouse'
import { selectProtocols } from '@db/protocols'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  const baseContext: BaseContext = {
    chain: 'ethereum',
    adapterId: '',
    client: getRPCClient({ chain: 'ethereum' }),
  }

  try {
    const protocols = await selectProtocols(client)
    return success({ protocols, count: protocols.length }, { maxAge: 60 * 60, swr: 10 * 60 })
  } catch (error) {
    console.error('Failed to get protocols', { error })
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to get protocols',
      message: (error as any).message,
    })
    return serverError('Failed to get protocols')
  }
}

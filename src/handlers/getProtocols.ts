import { client } from '@db/clickhouse'
import { selectProtocols } from '@db/protocols'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const protocols = await selectProtocols(client)
    return success({ protocols }, { maxAge: 60 * 60, swr: 10 * 60 })
  } catch (error) {
    console.error('Failed to get protocols', { error })
    return serverError('Failed to get protocols')
  }
}

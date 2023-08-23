import { connect } from '@db/clickhouse'
import { selectProtocols } from '@db/protocols'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const clickhouseClient = connect()
    const protocols = await selectProtocols(clickhouseClient)
    return success({ protocols }, { maxAge: 60 * 60 })
  } catch (error) {
    console.error('Failed to get protocols', { error })
    return serverError('Failed to get protocols')
  }
}

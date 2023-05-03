import pool from '@db/pool'
import { selectProtocols } from '@db/protocols'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const protocols = await selectProtocols(client)
    return success({ protocols }, { maxAge: 60 * 60 })
  } catch (error) {
    console.error('Failed to get protocols', { error })
    return serverError('Failed to get protocols')
  } finally {
    client.release(true)
  }
}

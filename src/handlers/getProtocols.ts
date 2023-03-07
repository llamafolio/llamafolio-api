import pool from '@db/pool'
import { selectProtocols } from '@db/protocols'
import { success } from '@handlers/response'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const id = event.queryStringParameters?.id as string

  const client = await pool.connect()

  const protocols = await selectProtocols(client, id)

  return success(protocols, { maxAge: 60 * 60 })
}

import pool from '@db/pool'
import { selectProtocols } from '@db/protocols'
import { success } from '@handlers/response'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  const client = await pool.connect()

  const protocols = await selectProtocols(client)

  return success(
    {
      protocols,
    },
    { maxAge: 60 * 60 },
  )
}

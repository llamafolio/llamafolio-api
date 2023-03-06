import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { bufToStr } from '@lib/buf'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const chain = event.pathParameters?.chain
  if (!chain) {
    return badRequest('Missing chain parameter')
  }

  const client = await pool.connect()

  try {
    const adapterContracts = await client.query(
      `select distinct address, adapter_id from contracts where chain = $1 and adapter_id <> 'wallet';`,
      [chain],
    )

    return success(
      {
        data: adapterContracts.rows.map((row) => ({
          adapter_id: row.adapter_id,
          address: bufToStr(row.address),
        })),
      },
      { maxAge: 10 * 60 },
    )
  } catch (e) {
    console.error('Failed to fetch adapters contracts', e)
    return serverError('Failed to fetch adapters contracts')
  } finally {
    client.release(true)
  }
}

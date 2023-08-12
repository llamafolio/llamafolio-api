import { selectDistinctAdaptersIds, selectDistinctAdaptersIdsV1 } from '@db/adapters'
import { connect } from '@db/clickhouse'
import pool from '@db/pool'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const adapters = await selectDistinctAdaptersIds(client)

    return success(
      {
        data: {
          adapters: adapters.map((adapter) => ({ id: adapter.id })),
        },
      },
      { maxAge: 30 * 60 },
    )
  } catch (error) {
    console.error('Failed to get adapters', { error })
    return serverError('Failed to get adapters')
  } finally {
    client.release(true)
  }
}

export const handlerV1: APIGatewayProxyHandler = async () => {
  try {
    const client = connect()

    const adapters = await selectDistinctAdaptersIdsV1(client)

    return success(
      {
        data: {
          adapters: adapters.map((adapter) => ({ id: adapter.id })),
        },
      },
      { maxAge: 30 * 60 },
    )
  } catch (error) {
    console.error('Failed to get adapters', { error })
    return serverError('Failed to get adapters')
  }
}

import pool from '@db/pool'
import { deleteAllYields, fetchYields, insertYields } from '@db/yields'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateYields: APIGatewayProxyHandler = async () => {
  // run in a Lambda because of APIGateway timeout
  await invokeLambda('updateYields', {}, 'Event')

  return success({})
}

export const scheduledUpdateYields = wrapScheduledLambda(updateYields)
export const handleUpdateYields = updateYields

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const yields = await fetchYields()

    await client.query('BEGIN')

    await deleteAllYields(client)

    await insertYields(client, yields)

    await client.query('COMMIT')

    console.log(`Inserted ${yields.length} yields`)

    return success({})
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Failed to update yields', e)
    return serverError('Failed to update yields')
  } finally {
    client.release(true)
  }
}

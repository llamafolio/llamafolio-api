import pool from '@db/pool'
import { deleteAllYields, fetchYields, insertYields } from '@db/yields'
import environment from '@environment'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { APIGatewayProxyHandler } from 'aws-lambda'

const updateYields: APIGatewayProxyHandler = async () => {
  // run in a Lambda because of APIGateway timeout
  const { STAGE } = environment
  await invokeLambda(`llamafolio-api-${STAGE}-updateYields`, {}, 'Event')

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
    console.error('Failed to update yields', e)
    return serverError('Failed to update yields')
  } finally {
    client.release(true)
  }
}

import { client } from '@db/clickhouse'
import { fetchYields, insertYields } from '@db/yields'
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

  try {
    const yields = await fetchYields()

    await insertYields(client, yields)

    console.log(`Inserted ${yields.length} yields`)

    return success({})
  } catch (e) {
    console.error('Failed to update yields', e)
    return serverError('Failed to update yields')
  }
}

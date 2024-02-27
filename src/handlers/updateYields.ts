import { client } from '@db/clickhouse'
import { fetchYields, insertYields } from '@db/yields'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { sendSlackMessage } from '@lib/slack'
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

  const baseContext: BaseContext = {
    chain: 'ethereum',
    adapterId: '',
    client: getRPCClient({ chain: 'ethereum' }),
  }

  try {
    const yields = await fetchYields()

    await insertYields(client, yields)

    console.log(`Inserted ${yields.length} yields`)

    return success({})
  } catch (error) {
    console.error('Failed to update yields', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to update yields',
      message: (error as any).message,
    })
    return serverError('Failed to update yields')
  }
}

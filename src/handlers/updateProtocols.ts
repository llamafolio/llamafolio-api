import { adapters } from '@adapters/index'
import { insertProtocols } from '@db/protocols'
import { client as redisClient } from '@db/redis'
import { STAGE } from '@env'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocolsLite, IProtocolLite } from '@lib/protocols'
import { APIGatewayProxyHandler } from 'aws-lambda'

export async function fetchProtocols(): Promise<IProtocolLite[]> {
  const protocols = await fetchProtocolsLite()

  const adaptersIds: string[] = adapters.map((adapter) => adapter.id)

  const protocolsFiltered = protocols.filter((protocol: { slug: string }) => adaptersIds.includes(protocol.slug))

  return protocolsFiltered
}

const updateProtocols: APIGatewayProxyHandler = async () => {
  // run in a Lambda because of APIGateway timeout
  await invokeLambda(`llamafolio-api-${STAGE}-updateProtocols`, {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocol = wrapScheduledLambda(updateProtocols)
export const handleUpdateProtocols = updateProtocols

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  try {
    const protocols = await fetchProtocols()

    await insertProtocols(redisClient, protocols)

    console.log(`Inserted ${protocols.length} protocols`)

    return success({})
  } catch (e) {
    console.error('Failed to update protocols information', e)
    return serverError('Failed to update protocols information')
  }
}

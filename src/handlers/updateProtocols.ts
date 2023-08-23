import { selectDistinctAdaptersIds } from '@db/adapters'
import { connect } from '@db/clickhouse'
import { insertProtocols } from '@db/protocols'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocols } from '@lib/protocols'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateProtocols: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateProtocols', {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocols = wrapScheduledLambda(updateProtocols)

export const handler: APIGatewayProxyHandler = async () => {
  const client = connect()

  try {
    const adapters = await selectDistinctAdaptersIds(client)

    // 'wallet' is a custom LlamaFolio adapter (not a protocol)
    const adaptersIds = adapters.map((adapter) => adapter.id).filter((id) => id !== 'wallet')

    const protocols = await fetchProtocols(adaptersIds)

    await insertProtocols(client, protocols)

    console.log(`Inserted ${protocols.length} protocols`)

    return success({})
  } catch (e) {
    console.log('Failed to update protocols', e)
    return serverError('Failed to update protocols')
  }
}

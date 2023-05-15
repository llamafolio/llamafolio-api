import { selectDistinctAdaptersIds } from '@db/adapters'
import pool from '@db/pool'
import { deleteAllProtocols, insertProtocols } from '@db/protocols'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocols } from '@lib/protocols'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateProtocols: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateProtocols', {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocols = wrapScheduledLambda(updateProtocols)

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const adapters = await selectDistinctAdaptersIds(client)

    // 'wallet' is a custom LlamaFolio adapter (not a protocol)
    const adaptersIds = adapters.map((adapter) => adapter.id).filter((id) => id !== 'wallet')

    const protocols = await fetchProtocols(adaptersIds)

    await client.query('BEGIN')

    await deleteAllProtocols(client)

    await insertProtocols(client, protocols)

    await client.query('COMMIT')

    console.log(`Inserted ${protocols.length} protocols`)

    return success({})
  } catch (e) {
    await client.query('ROLLBACK')
    console.log('Failed to update protocols', e)
    return serverError('Failed to update protocols')
  }
}

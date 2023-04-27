import { selectDistinctAdaptersIds } from '@db/adapters'
import pool from '@db/pool'
import { deleteAllProtocols, insertProtocols } from '@db/protocols'
import { environment } from '@environment'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocols } from '@lib/protocols'
import { APIGatewayProxyHandler } from 'aws-lambda'

const { STAGE } = environment

const updateProtocols: APIGatewayProxyHandler = async () => {
  await invokeLambda(`llamafolio-api-${STAGE}-updateProtocols`, {}, 'Event')

  return success({})
}

export const scheduledUpdateProtocols = wrapScheduledLambda(updateProtocols)

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const adapters = await selectDistinctAdaptersIds(client)

    const adaptersIds = adapters.map((adapter) => adapter.id)

    const protocols = await fetchProtocols(adaptersIds)

    await client.query('BEGIN')

    await deleteAllProtocols(client)

    await insertProtocols(client, protocols)

    await client.query('COMMIT')

    console.log(`Inserted ${protocols.length} protocols`)

    return success({})
  } catch (e) {
    console.log('Failed to update protocols', e)
    return serverError('Failed to update protocols')
  }
}

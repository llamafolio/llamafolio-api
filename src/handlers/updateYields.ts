import pool from '@db/pool'
import { deleteAllYields, insertYields, YieldOld } from '@db/yields'
import { STAGE } from '@env'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { APIGatewayProxyHandler } from 'aws-lambda'
import fetch from 'node-fetch'

interface YieldOldResponse {
  status: string
  data: YieldOld[]
}

async function fetchYields() {
  const yieldsRes = await fetch('https://yields.llama.fi/poolsOld')
  const yields: YieldOldResponse = await yieldsRes.json()
  return yields.data
}

const updateYields: APIGatewayProxyHandler = async () => {
  // run in a Lambda because of APIGateway timeout
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

    console.log(`Inserting ${yields.length} yields`)

    await insertYields(client, yields)

    await client.query('COMMIT')

    console.log(`Inserted ${yields.length} yields`)

    return success({})
  } catch (e) {
    console.error('Failed to update yields', e)
    await client.query('ROLLBACK')
    return serverError('Failed to update yields')
  } finally {
    client.release(true)
  }
}

import { adapters } from '@adapters/index'
import { insertContracts } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import format from 'pg-format'

const revalidateAdaptersContracts: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const [expiredAdaptersRes, adapterIdsRes] = await Promise.all([
      client.query(`select distinct(id) from adapters where contracts_expire_at <= now();`, []),
      client.query(`select id from adapters;`, []),
    ])

    const adapterIds = new Set(adapterIdsRes.rows.map((row) => row.id))

    const revalidateAdapterIds = new Set()

    // revalidate expired adapters
    for (const row of expiredAdaptersRes.rows) {
      revalidateAdapterIds.add(row.id)
    }

    // revalidate new adapters (not stored in our DB yet)
    for (const adapter of adapters) {
      if (!adapterIds.has(adapter.id)) {
        revalidateAdapterIds.add(adapter.id)
      }
    }

    const revalidateAdapterIdsArr = [...revalidateAdapterIds]

    if (revalidateAdapterIdsArr.length > 0) {
      // Run adapters "getContracts" in Lambdas
      for (const adapterId of revalidateAdapterIdsArr) {
        invokeLambda(`llamafolio-api-${process.env.stage}-revalidateAdapterContracts`, {
          adapterId,
        })
      }
    }

    return success({
      data: revalidateAdapterIdsArr,
    })
  } catch (e) {
    console.error('Failed to revalidate adapters contracts', e)
    return serverError('Failed to revalidate adapters contracts')
  } finally {
    client.release(true)
  }
}

export const scheduledRevalidateAdaptersContracts = wrapScheduledLambda(revalidateAdaptersContracts)

export const revalidateAdapterContracts: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  const { adapterId } = event as APIGatewayProxyEvent & { adapterId?: string }

  if (!adapterId) {
    return badRequest(`Missing adapterId parameter`)
  }

  const adapter = adapters.find((adapter) => adapter.id === adapterId)
  if (!adapter) {
    console.error(`Failed to revalidate adapter contracts, could not find adapter with id: ${adapterId}`)
    return serverError(`Failed to revalidate adapter contracts, could not find adapter with id: ${adapterId}`)
  }

  const config = await adapter.getContracts()

  let expire_at: Date | null = null
  if (config.revalidate) {
    expire_at = new Date()
    expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
  }

  const deleteOldAdapterContractsValues = [[adapter.id]]

  const insertAdapterValues = [[adapter.id, expire_at]]

  try {
    await client.query('BEGIN')

    // Delete old contracts
    await client.query(format('DELETE FROM contracts WHERE adapter_id IN %L;', deleteOldAdapterContractsValues), [])

    // Insert adapter if not exists
    if (insertAdapterValues.length > 0) {
      await client.query(
        format('INSERT INTO adapters (id, contracts_expire_at) VALUES %L ON CONFLICT DO NOTHING;', insertAdapterValues),
        [],
      )
    }

    // Insert new contracts
    await insertContracts(client, config.contracts, adapter.id)

    await client.query('COMMIT')

    return success({})
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Failed to revalidate adapter contracts', e)
    return serverError('Failed to revalidate adapter contracts')
  } finally {
    client.release(true)
  }
}

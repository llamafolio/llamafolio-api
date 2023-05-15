import { adapters } from '@adapters/index'
import type { Adapter as DBAdapter } from '@db/adapters'
import { selectAdapter, selectAdaptersContractsExpired, selectDistinctAdaptersIds, upsertAdapters } from '@db/adapters'
import { deleteContractsByAdapter, insertAdaptersContracts } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { resolveContractsTokens } from '@lib/token'
import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

const revalidateAdaptersContracts: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const [expiredAdaptersRes, adapterIdsRes] = await Promise.all([
      selectAdaptersContractsExpired(client),
      selectDistinctAdaptersIds(client),
    ])

    const adapterIds = new Set(adapterIdsRes.map((adapter) => adapter.id))

    const adaptersToRevalidate: [string, Chain][] = []

    // revalidate expired adapters
    for (const adapter of expiredAdaptersRes) {
      adaptersToRevalidate.push([adapter.id, adapter.chain])
    }

    // revalidate new adapters (not stored in our DB yet)
    for (const adapter of adapters) {
      if (!adapterIds.has(adapter.id)) {
        for (const chain of chains) {
          if (adapter[chain.id]) {
            adaptersToRevalidate.push([adapter.id, chain.id])
          }
        }
      }
    }

    if (adaptersToRevalidate.length > 0) {
      // Run "getContracts" in Lambdas
      for (const [adapterId, chain] of adaptersToRevalidate) {
        invokeLambda('revalidateAdapterContracts', { adapterId, chain })
      }
    }

    return success({
      data: adaptersToRevalidate,
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

  const { adapterId, chain } = event as APIGatewayProxyEvent & { adapterId?: string; chain?: Chain }

  if (!adapterId) {
    return badRequest(`Missing adapterId parameter`)
  }
  if (!chain) {
    return badRequest(`Missing chain parameter`)
  }

  const adapter = adapters.find((adapter) => adapter.id === adapterId)
  if (!adapter) {
    console.error(`Failed to revalidate adapter contracts, could not find adapter with id: ${adapterId}`)
    return serverError(`Failed to revalidate adapter contracts, could not find adapter with id: ${adapterId}`)
  }

  if (!adapter[chain]) {
    console.error(`Failed to revalidate adapter contracts, adapter ${adapterId} is missing handlers for chain ${chain}`)
    return serverError(
      `Failed to revalidate adapter contracts, adapter ${adapterId} is missing handlers for chain ${chain}`,
    )
  }

  try {
    const prevDbAdapter = await selectAdapter(client, chain, adapter.id)

    const ctx: BaseContext = { chain, adapterId: adapter.id }

    const config = await adapter[chain]!.getContracts(ctx, prevDbAdapter?.contractsRevalidateProps || {})

    const [contracts, props] = await Promise.all([
      resolveContractsTokens(client, config.contracts || {}, true),
      config.props ? resolveContractsTokens(client, config.props, true) : undefined,
    ])

    let expire_at: Date | undefined = undefined
    if (config.revalidate) {
      expire_at = new Date()
      expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
    }

    const dbAdapter: DBAdapter = {
      id: adapterId,
      chain,
      contractsExpireAt: expire_at,
      contractsRevalidateProps: config.revalidateProps,
      contractsProps: props,
      createdAt: new Date(),
    }

    await client.query('BEGIN')

    await upsertAdapters(client, [dbAdapter])

    // Delete old contracts unless it's a revalidate.
    // In such case we want to add new contracts, not replace the old ones
    if (!config.revalidate) {
      await deleteContractsByAdapter(client, adapterId, chain)
    }

    // Insert new contracts
    await insertAdaptersContracts(client, contracts, adapter.id)

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

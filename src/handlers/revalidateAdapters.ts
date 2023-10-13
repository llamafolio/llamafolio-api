import { adapters } from '@adapters/index'
import type { Adapter as DBAdapter } from '@db/adapters'
import { insertAdapters, selectAdapter, selectAdaptersContractsExpired, selectDistinctAdaptersIds } from '@db/adapters'
import { client } from '@db/clickhouse'
import { flattenContracts, insertAdaptersContracts } from '@db/contracts'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { chainById, chains } from '@lib/chains'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocolToParentMapping } from '@lib/protocols'
import { resolveContractsTokens } from '@lib/token'
import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

const revalidateAdaptersContracts: APIGatewayProxyHandler = async (_event, _context) => {
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
  }
}

export const scheduledRevalidateAdaptersContracts = wrapScheduledLambda(revalidateAdaptersContracts)

export const revalidateAdapterContracts: APIGatewayProxyHandler = async (event, _context) => {
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

  const chainId = chainById[chain]?.chainId
  if (chainId == null) {
    console.error(`Failed to revalidate adapter contracts, chain ${chain} is missing`)
    return serverError(`Failed to revalidate adapter contracts, chain ${chain} is missing`)
  }

  try {
    const prevDbAdapter = await selectAdapter(client, chainId, adapter.id)

    const ctx: BaseContext = { chain, adapterId: adapter.id }

    const config = await adapter[chain]!.getContracts(ctx, prevDbAdapter?.contractsRevalidateProps || {})

    const [contracts, props] = await Promise.all([
      resolveContractsTokens(ctx, config.contracts || {}),
      config.props ? resolveContractsTokens(ctx, config.props) : undefined,
    ])

    const now = new Date()

    const protocolToParent = await fetchProtocolToParentMapping()

    let expire_at: Date | undefined = undefined
    if (config.revalidate) {
      expire_at = new Date(now)
      expire_at.setSeconds(expire_at.getSeconds() + config.revalidate)
    }

    const dbAdapter: DBAdapter = {
      id: adapterId,
      parentId: protocolToParent[adapterId] || '',
      chain,
      contractsExpireAt: expire_at,
      contractsRevalidateProps: config.revalidateProps,
      contractsProps: props,
      createdAt: prevDbAdapter?.createdAt || now,
      updatedAt: now,
    }

    await insertAdapters(client, [dbAdapter])

    // Insert new contracts
    // add context to contracts
    const adapterContracts = flattenContracts(contracts).map((contract) => ({
      chain,
      adapterId: adapter.id,
      timestamp: now,
      ...contract,
    }))
    await insertAdaptersContracts(client, adapterContracts)

    return success({})
  } catch (e) {
    console.error('Failed to revalidate adapter contracts', e)
    return serverError('Failed to revalidate adapter contracts')
  }
}

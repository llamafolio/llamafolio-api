import { adapters } from '@adapters/index'
import { selectAdapter, selectAdaptersContractsExpired, selectDistinctAdaptersIds } from '@db/adapters'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { revalidateAdapterContracts, type BaseContext } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { chainById, chains, getRPCClient } from '@lib/chains'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { fetchProtocolToParentMapping } from '@lib/protocols'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

const revalidateAdaptersContractsHandler: APIGatewayProxyHandler = async (_event, _context) => {
  const baseContext: BaseContext = {
    chain: 'ethereum',
    adapterId: '',
    client: getRPCClient({ chain: 'ethereum' }),
  }

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
  } catch (error) {
    console.error('Failed to revalidate adapters contracts', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to revalidate adapters contracts',
      message: (error as any).message,
    })
    return serverError('Failed to revalidate adapters contracts')
  }
}

export const scheduledRevalidateAdaptersContracts = wrapScheduledLambda(revalidateAdaptersContractsHandler)

export const revalidateAdapterContractsHandler: APIGatewayProxyHandler = async (event, _context) => {
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

  const baseContext: BaseContext = {
    chain,
    adapterId,
    client: getRPCClient({ chain }),
  }

  try {
    const [prevDbAdapter, protocolToParent] = await Promise.all([
      selectAdapter(client, adapter.id, chainId),
      fetchProtocolToParentMapping(),
    ])

    await revalidateAdapterContracts(client, adapter, chain, prevDbAdapter, protocolToParent)

    return success({})
  } catch (error) {
    console.error('Failed to revalidate adapter contracts', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to revalidate adapter contracts',
      message: (error as any).message,
    })
    return serverError('Failed to revalidate adapter contracts')
  }
}

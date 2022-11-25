import { selectBalancesByFromAddress } from '@db/balances'
import { selectLastBalancesSnapshotsByFromAddress } from '@db/balances-snapshots'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { PricedBalance } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { isHex } from '@lib/buf'
import { Chain } from '@lib/chains'
import { APIGatewayProxyHandler } from 'aws-lambda'

interface BalancesProtocolChainResponse {
  id: Chain
  balances: PricedBalance[]
  healthFactor?: number
}

export interface BalancesProtocolResponse {
  id: string
  chains: BalancesProtocolChainResponse[]
}

export interface BalancesResponse {
  updatedAt: string
  protocols: BalancesProtocolResponse[]
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = await pool.connect()

  try {
    const [pricedBalances, lastBalancesSnapshots] = await Promise.all([
      selectBalancesByFromAddress(client, address),
      selectLastBalancesSnapshotsByFromAddress(client, address),
    ])

    const protocols: BalancesProtocolResponse[] = []
    const balancesByAdapterId = groupBy(pricedBalances, 'adapterId')
    const balancesSnapshotsByAdapterId = groupBy(lastBalancesSnapshots, 'adapterId')

    for (const adapterId in balancesByAdapterId) {
      const balancesByChain = groupBy(balancesByAdapterId[adapterId], 'chain')
      const balancesSnapshotsByChain = groupBy(balancesSnapshotsByAdapterId[adapterId] || [], 'chain')

      const chains: BalancesProtocolChainResponse[] = []

      for (const chain in balancesByChain) {
        const balanceSnapshot = balancesSnapshotsByChain[chain]?.[0]

        chains.push({
          id: chain as Chain,
          balances: balancesByChain[chain],
          healthFactor: balanceSnapshot?.healthFactor,
        })
      }

      protocols.push({
        id: adapterId,
        chains,
      })
    }

    const updatedAt = pricedBalances[0]?.timestamp

    const balancesResponse: BalancesResponse = {
      updatedAt,
      protocols,
    }

    return success(balancesResponse)
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}

import { selectLastBalancesSnapshotsByFromAddress } from '@db/balances-snapshots'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { groupBy } from '@lib/array'
import { sumBalances } from '@lib/balance'
import { isHex } from '@lib/buf'
import { Chain } from '@lib/chains'
import { TUnixTimestamp } from '@lib/type'
import { APIGatewayProxyHandler } from 'aws-lambda'

export interface SnapshotChainResponse {
  id: Chain
  balanceUSD: number
}

export interface LatestSnapshotResponse {
  balanceUSD: number
  chains: SnapshotChainResponse[]
  updatedAt?: TUnixTimestamp
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
    const lastBalancesSnapshots = await selectLastBalancesSnapshotsByFromAddress(client, address)

    if (lastBalancesSnapshots.length === 0) {
      const response: LatestSnapshotResponse = {
        balanceUSD: 0,
        chains: [],
      }
      // balances updates minimum interval is 2 minutes
      return success(response, { maxAge: 2 * 60 })
    }

    const timestamp = lastBalancesSnapshots[0].timestamp

    const lastBalancesSnapshotsByChain = groupBy(lastBalancesSnapshots, 'chain')

    const response: LatestSnapshotResponse = {
      balanceUSD: sumBalances(lastBalancesSnapshots),
      chains: Object.keys(lastBalancesSnapshotsByChain).map((chain) => ({
        id: chain as Chain,
        balanceUSD: sumBalances(lastBalancesSnapshotsByChain[chain]),
      })),
      updatedAt: Math.floor(new Date(timestamp).getTime() / 1000),
    }

    return success(response, { maxAge: 2 * 60 })
  } catch (e) {
    console.error('Failed to retrieve latest snapshot', e)
    return serverError('Failed to retrieve latest snapshot')
  } finally {
    client.release(true)
  }
}

import { selectLastBalancesGroupsByFromAddress } from '@db/balances-groups'
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
    const lastBalancesGroups = await selectLastBalancesGroupsByFromAddress(client, address)

    if (lastBalancesGroups.length === 0) {
      const response: LatestSnapshotResponse = {
        balanceUSD: 0,
        chains: [],
      }
      // balances updates minimum interval is 2 minutes
      return success(response, { maxAge: 2 * 60 })
    }

    const timestamp = lastBalancesGroups[0].timestamp

    const lastBalancesGroupsByChain = groupBy(lastBalancesGroups, 'chain')

    const response: LatestSnapshotResponse = {
      balanceUSD: sumBalances(lastBalancesGroups),
      chains: Object.keys(lastBalancesGroupsByChain).map((chain) => ({
        id: chain as Chain,
        balanceUSD: sumBalances(lastBalancesGroupsByChain[chain]),
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

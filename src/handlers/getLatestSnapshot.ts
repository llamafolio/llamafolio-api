import { selectLastBalancesSnapshotsByFromAddress } from '@db/balances-snapshots'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { sumBalances } from '@lib/balance'
import { isHex } from '@lib/buf'
import { TUnixTimestamp } from '@lib/type'
import { APIGatewayProxyHandler } from 'aws-lambda'

interface LatestSnapshotResponse {
  balanceUSD: number
  updatedAt: TUnixTimestamp
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
      // balances updates minimum interval is 2 minutes
      return success({}, { maxAge: 2 * 60 })
    }

    const timestamp = lastBalancesSnapshots[0].timestamp

    const response: LatestSnapshotResponse = {
      updatedAt: Math.floor(new Date(timestamp).getTime()),
      balanceUSD: sumBalances(lastBalancesSnapshots),
    }

    return success(response, { maxAge: 2 * 60 })
  } catch (e) {
    console.error('Failed to retrieve latest snapshot', e)
    return serverError('Failed to retrieve latest snapshot')
  } finally {
    client.release(true)
  }
}

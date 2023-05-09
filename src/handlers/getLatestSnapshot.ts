import { selectLastBalancesGroupsByFromAddress } from '@db/balances-groups'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import { sum } from '@lib/math'
import type { TUnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface SnapshotChainResponse {
  id: Chain
  balanceUSD: number
  debtUSD: number
  rewardUSD: number
}

export interface LatestSnapshotResponse {
  balanceUSD: number
  debtUSD: number
  rewardUSD: number
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
        debtUSD: 0,
        rewardUSD: 0,
        chains: [],
      }
      // balances updates minimum interval is 2 minutes
      return success(response, { maxAge: 5 * 60 })
    }

    const timestamp = lastBalancesGroups[0].timestamp

    const chains = lastBalancesGroups.map((row) => ({
      id: row.chain as Chain,
      balanceUSD: row.balanceUSD,
      debtUSD: row.debtUSD,
      rewardUSD: row.rewardUSD,
    }))

    const response: LatestSnapshotResponse = {
      balanceUSD: sum(chains.map((group) => group.balanceUSD)),
      debtUSD: sum(chains.map((group) => group.debtUSD)),
      rewardUSD: sum(chains.map((group) => group.rewardUSD)),
      chains,
      updatedAt: Math.floor(new Date(timestamp).getTime() / 1000),
    }

    return success(response, { maxAge: 5 * 60 })
  } catch (e) {
    console.error('Failed to retrieve latest snapshot', e)
    return serverError('Failed to retrieve latest snapshot')
  } finally {
    client.release(true)
  }
}

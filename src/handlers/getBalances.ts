import { type LatestProtocolBalances, selectLatestProtocolsBalancesByFromAddress } from '@db/balances'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { updateBalances } from '@handlers/updateBalances'
import { areBalancesStale, BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

type Status = 'stale' | 'success'

interface BalancesResponse {
  status: Status
  updatedAt: number
  nextUpdateAt: number
  protocols: LatestProtocolBalances[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address?.toLowerCase() as `0x${string}`
  console.log('Get balances', address)
  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const { updatedAt, protocolsBalances } = await selectLatestProtocolsBalancesByFromAddress(client, address)

    // update stale or missing balances
    if (updatedAt === undefined || areBalancesStale(updatedAt)) {
      const { updatedAt, protocolsBalances } = await updateBalances(client, address)

      const _updatedAt = updatedAt || Math.floor(Date.now() / 1000)

      const balancesResponse: BalancesResponse = {
        status: 'success',
        updatedAt: _updatedAt,
        nextUpdateAt: updatedAt + BALANCE_UPDATE_THRESHOLD_SEC,
        protocols: protocolsBalances,
      }

      return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 5 * 86_400 })
    }

    const balancesResponse: BalancesResponse = {
      status: 'success',
      updatedAt,
      nextUpdateAt: updatedAt + BALANCE_UPDATE_THRESHOLD_SEC,
      protocols: protocolsBalances,
    }

    return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 5 * 86_400 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances', { error, address })
  }
}

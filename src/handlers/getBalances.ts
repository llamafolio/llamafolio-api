import { type LatestProtocolBalances, selectLatestProtocolsBalancesByFromAddresses } from '@db/balances'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/contract'
import { parseAddresses, unixFromDate } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

type Status = 'stale' | 'success'

interface BalancesResponse {
  status: Status
  updatedAt?: number
  nextUpdateAt: number
  protocols: LatestProtocolBalances[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  console.log('Get balances', addresses)
  if (addresses.length === 0) {
    return badRequest('Missing address parameter')
  }

  if (addresses.some((address) => !isHex(address))) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const { updatedAt, protocolsBalances, staleAddresses } = await selectLatestProtocolsBalancesByFromAddresses(
      client,
      addresses,
    )

    const status: Status = updatedAt === undefined || staleAddresses.length > 0 ? 'stale' : 'success'

    const balancesResponse: BalancesResponse = {
      status,
      updatedAt,
      nextUpdateAt: updatedAt != null ? updatedAt + BALANCE_UPDATE_THRESHOLD_SEC : unixFromDate(new Date()),
      protocols: protocolsBalances,
    }

    return success(balancesResponse, { cacheControl: 'max-age=0, no-store' })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, addresses })
    return serverError('Failed to retrieve balances', { error, addresses })
  }
}

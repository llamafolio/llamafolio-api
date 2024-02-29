import { type LatestProtocolBalances, selectLatestProtocolsBalancesByFromAddresses } from '@db/balances'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import type { BalancesContext } from '@lib/adapter'
import { BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { getRPCClient } from '@lib/chains'
import { parseAddresses, unixFromDate } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
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
    return badRequest('Invalid address parameter')
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

    await Promise.all(
      addresses.map(async (address) => {
        const balancesContext: BalancesContext = {
          chain: 'ethereum',
          adapterId: '',
          client: getRPCClient({ chain: 'ethereum' }),
          address,
        }

        await sendSlackMessage(balancesContext, {
          level: 'error',
          header: { Service: 'getBalances' },
          title: 'Failed to retrieve balances',
          message: (error as any).message,
        })
      }),
    )

    return serverError('Failed to retrieve balances', { error, addresses })
  }
}

import { client } from '@db/clickhouse'
import { selectProtocolBalancesSnapshotsStatus, selectProtocolHoldersBalances } from '@db/protocols'
import { badRequest, Message, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface Holder {
  address: string
  balanceUSD?: number
  debtUSD?: number
  netBalanceUSD?: number
}

interface ProtocolHoldersResponse {
  holders: Holder[]
  count: number
  next: number
  message?: string
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const protocol = event.pathParameters?.protocol || ''
  if (!protocol) {
    return badRequest('Invalid protocol parameter')
  }

  const offset = Math.max(parseInt(event.queryStringParameters?.offset ?? '0'), 0)
  const limit = Math.min(parseInt(event.queryStringParameters?.limit ?? '100'), 100)

  const chainId = getChainId(event.queryStringParameters?.chain || 'ethereum')
  if (chainId == null) {
    return badRequest(`Unknown chain ${event.queryStringParameters?.chain}`)
  }

  try {
    const [balancesSnapshotsStatus, protocolHoldersBalances] = await Promise.all([
      selectProtocolBalancesSnapshotsStatus(client, protocol, chainId),
      selectProtocolHoldersBalances(client, protocol, chainId, limit, offset),
    ])

    let count = 0
    const holders: Holder[] = []

    for (const row of protocolHoldersBalances) {
      count = parseInt(row.count)

      holders.push({
        address: row.holder,
        balanceUSD: parseFloat(row.totalBalanceUSD),
        debtUSD: parseFloat(row.totalDebtUSD),
        netBalanceUSD: parseFloat(row.netBalanceUSD),
      })
    }

    const response: ProtocolHoldersResponse = {
      holders,
      count,
      next: Math.min(offset + limit, count),
      message: balancesSnapshotsStatus == null ? Message.NotSupportedYet : undefined,
    }

    return success(response, { maxAge: 30 * 60 })
  } catch (e) {
    console.error('Failed to retrieve protocol holders', e)
    return serverError('Failed to retrieve protocol holders')
  }
}

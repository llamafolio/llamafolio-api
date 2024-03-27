import { client } from '@db/clickhouse'
import { selectProtocolBalancesSnapshotsStatus, selectProtocolHoldersBalances } from '@db/protocols'
import { badRequest, Message, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { chainByChainId, getChainId, getRPCClient } from '@lib/chains'
import { unixFromDateTime } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { TUnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface Holder {
  address: string
  netBalanceUSD: number
  share: number
  balanceUSD: number
  debtUSD: number
}

interface ProtocolHoldersResponse {
  updatedAt?: TUnixTimestamp
  data: Holder[]
  totalNetBalanceUSD: number
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

  const baseContext: BaseContext = {
    chain: chainByChainId[chainId].id,
    adapterId: '',
    client: getRPCClient({ chain: chainByChainId[chainId].id }),
  }

  try {
    const [balancesSnapshotsStatus, protocolHoldersBalances] = await Promise.all([
      selectProtocolBalancesSnapshotsStatus(client, protocol, chainId),
      selectProtocolHoldersBalances(client, protocol, chainId, limit, offset),
    ])

    let count = 0
    let totalNetBalanceUSD = 0
    let updatedAt: TUnixTimestamp | undefined = undefined
    const holders: Holder[] = []

    for (const row of protocolHoldersBalances) {
      count = parseInt(row.count)
      totalNetBalanceUSD = parseFloat(row.totalNetBalanceUSD)
      updatedAt = unixFromDateTime(row.updatedAt)

      holders.push({
        address: row.holder,
        netBalanceUSD: parseFloat(row.netBalanceUSD),
        share: parseFloat(row.share),
        balanceUSD: parseFloat(row.totalBalanceUSD),
        debtUSD: parseFloat(row.totalDebtUSD),
      })
    }

    const response: ProtocolHoldersResponse = {
      updatedAt,
      data: holders,
      totalNetBalanceUSD,
      count,
      next: Math.min(offset + limit, count),
      message: balancesSnapshotsStatus == null ? Message.NotSupportedYet : undefined,
    }

    return success(response, { maxAge: 30 * 60 })
  } catch (error) {
    console.error('Failed to retrieve protocol holders', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to retrieve protocol holders',
      message: (error as any).message,
    })
    return serverError('Failed to retrieve protocol holders')
  }
}

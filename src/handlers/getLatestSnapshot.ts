import { selectLatestBalancesSnapshotByFromAddresses } from '@db/balances'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import type { BalancesContext } from '@lib/adapter'
import { type Chain, getRPCClient } from '@lib/chains'
import { parseAddresses } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { UnixTimestamp } from '@lib/type'
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
  updatedAt?: UnixTimestamp
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Missing address parameter')
  }

  try {
    const lastBalancesGroups = await selectLatestBalancesSnapshotByFromAddresses(client, addresses)

    return success(lastBalancesGroups, { maxAge: 5 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to retrieve latest snapshot', error)

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
          title: 'Failed to retrieve latest snapshot',
          message: (error as any).message,
        })
      }),
    )

    return serverError('Failed to retrieve latest snapshot', { error })
  }
}

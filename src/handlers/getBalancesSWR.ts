import { selectLatestBalancesGroupsByFromAddress } from '@db/balances'
import { connect } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { updateBalances } from '@handlers/updateBalances'
import { areBalancesStale, BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export interface GroupResponse {
  protocol: string
  chain: string
  balanceUSD: number
  debtUSD?: number
  rewardUSD?: number
  healthFactor?: number
  balances: any[]
}

export type Status = 'stale' | 'success'

export interface BalancesResponse {
  status: Status
  updatedAt: number
  nextUpdateAt: number
  groups: GroupResponse[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address as `0x${string}`
  console.log('Get balances', address)
  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = connect()

  try {
    const { updatedAt, balancesGroups } = await selectLatestBalancesGroupsByFromAddress(client, address)

    // update stale or missing balances
    if (updatedAt === undefined || areBalancesStale(updatedAt)) {
      const { updatedAt, balancesGroups } = await updateBalances(client, address)

      const _updatedAt = updatedAt || Math.floor(Date.now() / 1000)

      const balancesResponse: BalancesResponse = {
        status: 'success',
        updatedAt: _updatedAt,
        nextUpdateAt: updatedAt + BALANCE_UPDATE_THRESHOLD_SEC,
        groups: balancesGroups,
      }

      return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 86_400 })
    }

    const balancesResponse: BalancesResponse = {
      status: 'success',
      updatedAt,
      nextUpdateAt: updatedAt + BALANCE_UPDATE_THRESHOLD_SEC,
      groups: balancesGroups,
    }

    return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 86_400 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances', { error, address })
  }
}

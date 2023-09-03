import { selectLatestBalancesGroupsByFromAddress } from '@db/balances'
import { connect } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { updateBalances } from '@handlers/updateBalances'
import { areBalancesStale, BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/buf'
import { invokeLambda } from '@lib/lambda'
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

export type Status = 'empty' | 'stale' | 'success'

export interface BalancesResponse {
  status: Status
  updatedAt?: number
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

    // no balance registered for this user
    if (updatedAt === undefined) {
      const { updatedAt, balancesGroups } = await updateBalances(client, address)

      const now = Date.now()

      const balancesResponse: BalancesResponse = {
        status: updatedAt ? 'success' : 'empty',
        updatedAt: Math.floor(now / 1000),
        groups: balancesGroups,
      }

      return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 604_800 })
    }

    // update in the background
    if (areBalancesStale(updatedAt)) {
      await invokeLambda('updateBalances', { address }, 'RequestResponse')

      const balancesResponse: BalancesResponse = {
        status: 'stale',
        updatedAt,
        groups: balancesGroups,
      }

      return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 604_800 })
    }

    const balancesResponse: BalancesResponse = {
      status: 'success',
      updatedAt,
      groups: balancesGroups,
    }

    return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC, swr: 604_800 })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  }
}

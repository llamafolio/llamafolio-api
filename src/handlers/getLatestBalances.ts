import { connect } from '@db/clickhouse'
import type { BalancesResponse } from '@handlers/getBalances'
import { badRequest, serverError, success } from '@handlers/response'
import { updateBalances } from '@handlers/updateBalances'
import { BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const address = event.pathParameters?.address as `0x${string}`
  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  console.log('Get latest balances', address)

  const client = connect()

  try {
    const { updatedAt, balancesGroups } = await updateBalances(client, address)

    const balancesResponse: BalancesResponse = {
      status: 'success',
      updatedAt,
      groups: balancesGroups,
    }

    return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  }
}

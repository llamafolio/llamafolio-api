import { selectBalancesWithGroupsAndYieldsByFromAddress } from '@db/balances'
import pool from '@db/pool'
import type { BalancesResponse } from '@handlers/getBalances'
import { formatBalancesGroups } from '@handlers/getBalances'
import { badRequest, serverError, success } from '@handlers/response'
import { updateBalances } from '@handlers/updateBalances'
import { BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address as `0x${string}`
  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  console.log('Get latest balances', address)

  const client = await pool.connect()

  try {
    await updateBalances(client, address)

    const balancesGroups = await selectBalancesWithGroupsAndYieldsByFromAddress(client, address)

    const updatedAt = balancesGroups[0]?.timestamp ? new Date(balancesGroups[0]?.timestamp).getTime() : undefined

    const balancesResponse: BalancesResponse = {
      status: 'success',
      updatedAt: updatedAt === undefined ? undefined : Math.floor(updatedAt / 1000),
      groups: formatBalancesGroups(balancesGroups),
    }

    return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}

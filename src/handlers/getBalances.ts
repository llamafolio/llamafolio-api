import { selectBalancesByFromAddress } from '@db/balances'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { Balance, PricedBalance } from '@lib/adapter'
import { isHex } from '@lib/buf'
import { APIGatewayProxyHandler } from 'aws-lambda'

export type AdapterBalance = Balance & { adapterId: string }
export type PricedAdapterBalance = PricedBalance & { adapterId: string }

export interface AdapterBalancesResponse {
  id: string
  data: (AdapterBalance | PricedAdapterBalance)[]
}

function groupBalancesByAdapter(balances: (AdapterBalance | PricedAdapterBalance)[]) {
  const balancesByAdapterId: {
    [key: string]: AdapterBalancesResponse
  } = {}
  for (const balance of balances) {
    if (!balancesByAdapterId[balance.adapterId]) {
      balancesByAdapterId[balance.adapterId] = {
        id: balance.adapterId,
        data: [],
      }
    }
    balancesByAdapterId[balance.adapterId].data.push(balance)
  }

  return Object.values(balancesByAdapterId)
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address
  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = await pool.connect()

  try {
    const pricedBalances = await selectBalancesByFromAddress(client, address)

    const data = groupBalancesByAdapter(pricedBalances)
    const updatedAt = data[0]?.data?.[0].timestamp

    return success({ updatedAt, data })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}

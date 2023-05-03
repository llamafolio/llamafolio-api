import { selectBalancesHolders } from '@db/balances'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

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
    const queries = event.queryStringParameters

    const chain = (queries?.chain || 'ethereum').replace(/['"]/g, '') as Chain

    const limit = queries?.limit ?? '100'

    const limitQuery = parseInt(limit) > 100 ? 100 : parseInt(limit)

    const balances = await selectBalancesHolders(client, address, chain, limitQuery)

    return success(
      {
        data: {
          balances,
        },
      },
      { maxAge: 10 * 60 },
    )
  } catch (e) {
    console.error('Failed to retrieve token holders', e)
    return serverError('Failed to retrieve token holders')
  } finally {
    client.release(true)
  }
}

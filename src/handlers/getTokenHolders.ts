import { selectBalancesHolders } from '@db/balances'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import { mulPrice } from '@lib/math'
import { getTokenPrice } from '@lib/price'
import type { Token } from '@lib/token'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface IHolder {
  address: string
  amount: string
  balanceUSD?: number
}

interface TokenHoldersResponse {
  holders: IHolder[]
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
    const queries = event.queryStringParameters

    const chain = (queries?.chain || 'ethereum').replace(/['"]/g, '') as Chain

    const limit = queries?.limit ?? '100'

    const limitQuery = parseInt(limit) > 100 ? 100 : parseInt(limit)

    const [balances, tokenPrice] = await Promise.all([
      selectBalancesHolders(client, address, chain, limitQuery),
      getTokenPrice({ chain, address } as Token),
    ])

    const response: TokenHoldersResponse = {
      holders: balances.map((balance) => ({
        address: balance.address,
        amount: balance.amount,
        balanceUSD:
          tokenPrice && tokenPrice.decimals
            ? mulPrice(balance.amount, tokenPrice.decimals, tokenPrice.price)
            : undefined,
      })),
    }

    return success(response, { maxAge: 10 * 60 })
  } catch (e) {
    console.error('Failed to retrieve token holders', e)
    return serverError('Failed to retrieve token holders')
  } finally {
    client.release(true)
  }
}

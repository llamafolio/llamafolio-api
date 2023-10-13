import { selectBalancesHolders } from '@db/balances'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import type { Chain } from '@lib/chains'
import { isHex } from '@lib/contract'
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

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

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
      holders: [],
    }

    return success(response, { maxAge: 10 * 60 })
  } catch (e) {
    console.error('Failed to retrieve token holders', e)
    return serverError('Failed to retrieve token holders')
  }
}

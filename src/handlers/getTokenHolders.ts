import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { getTokensHolders, HASURA_HEADERS } from '@lib/indexer'
import { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const queries = event.queryStringParameters

    if (!queries?.chain) {
      return badRequest('Missing chain parameter')
    }

    const chain = queries.chain.replace(/['"]/g, '')

    const limit = queries?.limit ?? '100'

    const limitQuery = parseInt(limit) > 100 ? 100 : parseInt(limit)

    const pageQuery = queries?.page === '0' ? 1 : queries?.page ? parseInt(queries?.page) : 1

    const offset = ((pageQuery - 1) * limitQuery).toFixed(0)

    const offsetNumber = parseInt(offset)

    const { erc20_balances, erc20_balances_aggregate } = await getTokensHolders(
      address,
      chain,
      limitQuery,
      offsetNumber,
      HASURA_HEADERS,
    )

    const pages = parseInt((erc20_balances_aggregate.aggregate.count / limitQuery).toFixed(0))

    return success(
      {
        data: {
          balances: erc20_balances,
          total_pages: pages,
          current_page: pageQuery >= pages ? pages : pageQuery,
          next_page: pageQuery >= pages ? pages : pageQuery + 1,
          total_holders: erc20_balances_aggregate.aggregate.count,
          total_supply: erc20_balances_aggregate.aggregate.sum.balance,
        },
      },
      { maxAge: 2 * 60 },
    )
  } catch (e) {
    console.error('Failed to retrieve token holders', e)
    return serverError('Failed to retrieve token holders')
  }
}

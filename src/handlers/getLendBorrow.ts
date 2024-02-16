import { client } from '@db/clickhouse'
import { type LendBorrowPool, selectLendBorrowPools } from '@db/lendBorrow'
import { badRequest, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import type { UnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface LendBorrowPoolResponse {
  data: LendBorrowPool[]
  count: number
  updatedAt?: UnixTimestamp
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (address == null) {
    return badRequest('Missing address parameter')
  }

  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  try {
    const { data, updatedAt } = await selectLendBorrowPools(client, chainId, address)

    const response: LendBorrowPoolResponse = {
      data,
      updatedAt,
      count: data.length,
    }

    return success(response, { maxAge: 60 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to find lend/borrow pools', error)
    return serverError('Failed to find lend/borrow pools', { error })
  }
}

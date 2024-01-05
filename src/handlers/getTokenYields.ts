import { client } from '@db/clickhouse'
import { selectTokenYields, type TokenYield } from '@db/yields'
import { badRequest, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import type { TUnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface TokenYieldsResponse {
  updatedAt: TUnixTimestamp
  data: TokenYield[]
  count: number
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (address == null) {
    return badRequest('Invalid address parameter')
  }

  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const offset = parseInt(event.queryStringParameters?.offset || '') || 0
  const limit = parseInt(event.queryStringParameters?.limit || '') || 25

  try {
    const { updatedAt, data, count } = await selectTokenYields(client, chainId, address, offset, limit)

    const response: TokenYieldsResponse = {
      updatedAt,
      data,
      count,
    }

    return success(response)
    // return success(response, { maxAge: 60 * 60, swr: 10 * 60 })
  } catch (error) {
    console.error('Failed to retrieve token yields', { error, address })
    return serverError('Failed to retrieve token yields', { error, address })
  }
}

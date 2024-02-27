import { client } from '@db/clickhouse'
import { selectTokenYields, type TokenYield } from '@db/yields'
import { badRequest, serverError, success } from '@handlers/response'
import type { BalancesContext } from '@lib/adapter'
import { chainByChainId, getChainId, getRPCClient } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { UnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface TokenYieldsResponse {
  updatedAt: UnixTimestamp
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

  const balancesContext: BalancesContext = {
    chain: chainByChainId[chainId].id,
    adapterId: '',
    client: getRPCClient({ chain: chainByChainId[chainId].id }),
    address,
  }

  const offset = event.queryStringParameters?.offset != null ? parseInt(event.queryStringParameters?.offset) : undefined
  if (offset != null && isNaN(offset)) {
    return badRequest('Invalid offset parameter')
  }
  const limit = event.queryStringParameters?.limit != null ? parseInt(event.queryStringParameters?.limit) : undefined
  if (limit != null && isNaN(limit)) {
    return badRequest('Invalid limit parameter')
  }

  try {
    const { updatedAt, data, count } = await selectTokenYields(client, chainId, address, limit, offset)

    const response: TokenYieldsResponse = {
      updatedAt,
      data,
      count,
    }

    return success(response, { maxAge: 30 * 60, swr: 10 * 60 })
  } catch (error) {
    console.error('Failed to retrieve token yields', { error, address })
    await sendSlackMessage(balancesContext, {
      level: 'error',
      title: 'Failed to retrieve token yields',
      message: (error as any).message,
    })
    return serverError('Failed to retrieve token yields', { error, address })
  }
}

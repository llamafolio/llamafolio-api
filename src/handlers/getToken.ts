import { client } from '@db/clickhouse'
import { selectToken } from '@db/tokens'
import { badRequest, serverError, success } from '@handlers/response'
import { type Chain, chainById } from '@lib/chains'
import { parseAddress } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface TokenResponse {
  data: {
    chain: string
    address: string
    type?: string
    decimals?: number
    symbol?: string
    name?: string
    coingeckoId?: string
    stable: boolean
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (!address) {
    return badRequest('Invalid address parameter')
  }

  const chain = event.pathParameters?.chain as Chain
  if (!chain) {
    return badRequest('Missing chain parameter')
  }

  const chainId = chainById[chain]?.chainId
  if (chainId == null) {
    return badRequest(`Unsupported chain ${chain}`)
  }

  try {
    const token = await selectToken(client, chainId, address)

    const response: TokenResponse = {
      data: {
        chain: chainById[chain].id,
        address,
        ...token,
      },
    }

    return success(response, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve token', e)
    return serverError('Failed to retrieve token')
  }
}

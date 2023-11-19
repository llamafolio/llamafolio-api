import { client } from '@db/clickhouse'
import { selectToken } from '@db/tokens'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import { chainByChainId, getChainId } from '@lib/chains'
import { abi as erc20Abi } from '@lib/erc20'
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
    totalSupply?: string
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (!address) {
    return badRequest('Invalid address parameter')
  }

  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const chain = chainByChainId[chainId].id

  const ctx: BaseContext = { chain, adapterId: '' }

  try {
    const [token, totalSupply] = await Promise.all([
      selectToken(client, chainId, address),
      call({ ctx, abi: erc20Abi.totalSupply, target: address }).catch(() => undefined),
    ])

    // fetch missing info on-chain
    const [decimals, symbol, name] = await Promise.all([
      token?.decimals || call({ ctx, abi: erc20Abi.decimals, target: address }).catch(() => undefined),
      token?.symbol || call({ ctx, abi: erc20Abi.symbol, target: address }).catch(() => undefined),
      token?.name || call({ ctx, abi: erc20Abi.name, target: address }).catch(() => undefined),
    ])

    const response: TokenResponse = {
      data: {
        ...token,
        decimals,
        symbol,
        name,
        chain,
        address,
        totalSupply: totalSupply?.toString(),
      },
    }

    return success(response, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve token', e)
    return serverError('Failed to retrieve token')
  }
}

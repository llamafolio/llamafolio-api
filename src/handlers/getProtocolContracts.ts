import { client } from '@db/clickhouse'
import { selectProtocolContracts } from '@db/protocols'
import { badRequest, serverError, success } from '@handlers/response'
import { Categories, type Category } from '@lib/category'
import { chainByChainId, getChainId } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface Contract {
  chain: string
  chainId: number
  address: string
  name: string
  token?: string
  symbol?: string
  decimals?: number
  underlyings: { address: string; symbol: string; decimals?: number }[]
  rewards: { address: string; symbol: string; decimals?: number }[]
}

export interface ProtocolContracts {
  count: number
  data: Contract[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const protocol = event.pathParameters?.protocol || ''
  if (!protocol) {
    return badRequest('Invalid protocol parameter')
  }

  const offset = Math.max(parseInt(event.queryStringParameters?.offset ?? '0'), 0)
  const limit = Math.min(parseInt(event.queryStringParameters?.limit ?? '100'), 100)

  const category = event.queryStringParameters?.category || ''
  if (category !== '' && Categories[category as unknown as Category] == null) {
    return badRequest(`Unknown category ${event.queryStringParameters?.category}`)
  }

  const chain = event.queryStringParameters?.chain || ''
  const chainId = getChainId(chain)
  if (chain !== '' && chainId == null) {
    return badRequest(`Unknown chain ${event.queryStringParameters?.chain}`)
  }

  try {
    const data: Contract[] = []
    let count = 0

    const contracts = await selectProtocolContracts(
      client,
      protocol,
      category as unknown as Category,
      chainId,
      limit,
      offset,
    )

    for (const contract of contracts) {
      count = parseInt(contract.count)

      const chainId = parseInt(contract.chain)
      const chain = chainByChainId[chainId]

      data.push({
        address: contract.address,
        chain: chain.id,
        chainId,
        name: contract.name,
        token: contract.token !== '' ? contract.token : undefined,
        symbol: contract.symbol !== '' ? contract.symbol : undefined,
        decimals: contract.decimals !== '' ? parseInt(contract.decimals) : undefined,
        underlyings: contract.underlyings.map(([address, symbol, decimals]) => ({
          address,
          symbol,
          decimals: decimals !== '' ? parseInt(decimals) : undefined,
        })),
        rewards: contract.rewards.map(([address, symbol, decimals]) => ({
          address,
          symbol,
          decimals: decimals !== '' ? parseInt(decimals) : undefined,
        })),
      })
    }

    const response: ProtocolContracts = {
      count,
      data,
    }

    return success(response, { maxAge: 10 * 60 })
  } catch (e) {
    console.error('Failed to retrieve protocol contracts', e)
    return serverError('Failed to retrieve protocol contracts')
  }
}

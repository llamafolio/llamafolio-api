import { client } from '@db/clickhouse'
import { selectLatestTokensTransfers } from '@db/tokensTransfers'
import { badRequest, serverError, success } from '@handlers/response'
import { chainByChainId, getChainId } from '@lib/chains'
import { parseAddress, unixFromDate } from '@lib/fmt'
import { mulPrice } from '@lib/math'
import { getTokenPrice } from '@lib/price'
import type { Token } from '@lib/token'
import type { TUnixTimestamp } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

type Window = 'd' | 'w' | 'm'
const WINDOWS: Window[] = ['d', 'w', 'm']

export interface TokenTransfer {
  timestamp: TUnixTimestamp
  transactionHash: string
  logIndex: number
  balanceUSD?: number
  amount: string
  fromAddress: string
  toAddress: string
}

export interface LatestTokensTransfersResponse {
  updatedAt: TUnixTimestamp
  data: TokenTransfer[]
  count: number
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (address == null) {
    return badRequest('Missing address parameter')
  }

  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const window = (event.queryStringParameters?.w?.toLowerCase() as Window) || 'm'
  if (!WINDOWS.includes(window)) {
    return badRequest('Unsupported window')
  }

  const offset = parseInt(event.queryStringParameters?.offset || '') || 0
  const limit = parseInt(event.queryStringParameters?.limit || '') || 25

  try {
    const [latestTokensTransfers, tokenPrice] = await Promise.all([
      selectLatestTokensTransfers(client, chainId, address, limit, offset, window),
      getTokenPrice({ chain: chainByChainId[chainId].id, address } as Token),
    ])

    const tokensTransfers: TokenTransfer[] = []
    let count = 0
    let updatedAt = unixFromDate(new Date())

    for (const tokenTransfer of latestTokensTransfers) {
      count = tokenTransfer.count
      updatedAt = tokenTransfer.updatedAt

      tokensTransfers.push({
        ...tokenTransfer,
        balanceUSD:
          tokenPrice?.price != null && tokenPrice?.decimals != null
            ? mulPrice(BigInt(tokenTransfer.amount), tokenPrice.decimals, tokenPrice.price)
            : undefined,
      })
    }

    const response: LatestTokensTransfersResponse = {
      updatedAt,
      data: tokensTransfers,
      count,
    }

    return success(response, { maxAge: 3 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to retrieve latest tokens transfers', error)
    return serverError('Failed to retrieve latest tokens transfers', { error })
  }
}

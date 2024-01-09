import { client } from '@db/clickhouse'
import { selectLatestDexes } from '@db/dexes'
import { badRequest, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import { unixFromDate } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface Dexes {
  transactionHash: string
  logIndex: number
  timestamp: number
  data: any
}

type Window = 'd' | 'w' | 'm'
const WINDOWS: Window[] = ['d', 'w', 'm']

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const window = (event.queryStringParameters?.w?.toLowerCase() as Window) || 'd'
  if (!WINDOWS.includes(window)) {
    return badRequest('Unsupported window')
  }

  const offset = parseInt(event.queryStringParameters?.offset || '') || 0
  const limit = parseInt(event.queryStringParameters?.limit || '') || 25

  try {
    const latestDexes = await selectLatestDexes(client, chainId, limit, offset, window)

    const dexes: Dexes[] = latestDexes.map((latestDexes) => {
      const { transactionHash, logIndex, timestamp, signature, data } = latestDexes
      return { transactionHash, logIndex, timestamp, signature, data: data.data.args }
    })

    const lastDex = latestDexes[latestDexes.length - 1]
    const response = {
      updatedAt: lastDex ? lastDex.updatedAt : unixFromDate(new Date()),
      count: lastDex ? lastDex.count : 0,
      data: dexes,
    }

    return success(response, { maxAge: 3 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to retrieve latest dexes', error)
    return serverError('Failed to retrieve latest dexes', { error })
  }
}

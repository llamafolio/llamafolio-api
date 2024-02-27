import { client } from '@db/clickhouse'
import { selectTrendingContracts } from '@db/contracts'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { chainByChainId, getChainId, getRPCClient } from '@lib/chains'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const WINDOWS = ['D', 'W', 'M']

interface TrendingContractsResponse {
  data: {
    chain: string
    chainId: number
    address: string
    count: number
  }[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const chainId = getChainId(event.queryStringParameters?.chain || '')

  const window = event.queryStringParameters?.w || 'M'
  if (!WINDOWS.includes(window)) {
    return badRequest(`Unsupported window ${event.queryStringParameters?.w}`)
  }

  const baseContext: BaseContext = {
    chain: chainByChainId[chainId].id,
    adapterId: '',
    client: getRPCClient({ chain: chainByChainId[chainId].id }),
  }

  try {
    const data = await selectTrendingContracts(client, window, chainId)

    const response: TrendingContractsResponse = { data }

    return success(response, { maxAge: 20 * 60, swr: 10 * 60 })
  } catch (error) {
    console.error('Failed to get trending contracts', { error })
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to get trending contracts',
      message: (error as any).message,
    })
    return serverError('Failed to get trending contracts')
  }
}

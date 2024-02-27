import { client } from '@db/clickhouse'
import { type GasChart, selectChainGasChart, type Window } from '@db/gas'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { chainByChainId, getChainId, getRPCClient } from '@lib/chains'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const WINDOWS: Window[] = ['D', 'W', 'M']

interface GasChartResponse {
  data: GasChart[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const chainId = getChainId(event.queryStringParameters?.chain || 'ethereum')
  if (chainId == null) {
    return badRequest(`Unknown chain ${event.queryStringParameters?.chain}`)
  }

  const baseContext: BaseContext = {
    chain: chainByChainId[chainId].id,
    adapterId: '',
    client: getRPCClient({ chain: chainByChainId[chainId].id }),
  }

  const window = (event.queryStringParameters?.w || 'M') as Window
  if (!WINDOWS.includes(window)) {
    return badRequest(`Unsupported window ${event.queryStringParameters?.w}`)
  }

  try {
    const data = await selectChainGasChart(client, chainId, window)

    const response: GasChartResponse = { data }

    return success(response, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to get gas chart', { error })
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to get gas chart',
      message: (error as any).message,
    })
    return serverError('Failed to get gas chart')
  }
}

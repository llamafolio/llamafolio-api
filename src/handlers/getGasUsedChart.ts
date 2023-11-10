import { client } from '@db/clickhouse'
import type { GasUsedChart, Window } from '@db/gasUsed'
import { selectGasUsedChart } from '@db/gasUsed'
import { badRequest, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const WINDOWS: Window[] = ['D', 'W', 'M']

interface GasUsedChartResponse {
  data: GasUsedChart[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const chainId = getChainId(event.queryStringParameters?.chain || 'ethereum')
  if (chainId == null) {
    return badRequest(`Unknown chain ${event.queryStringParameters?.chain}`)
  }

  const window = (event.queryStringParameters?.w || 'M') as Window
  if (!WINDOWS.includes(window)) {
    return badRequest(`Unsupported window ${event.queryStringParameters?.w}`)
  }

  try {
    const data = await selectGasUsedChart(client, chainId, window)

    const response: GasUsedChartResponse = { data }

    return success(response, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to gas used chart', { error })
    return serverError('Failed to get gas used chart')
  }
}

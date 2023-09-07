import { client } from '@db/clickhouse'
import type { Window } from '@db/gas-price'
import { selectGasPriceChart } from '@db/gas-price'
import { badRequest, serverError, success } from '@handlers/response'
import { type Chain, chainById } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const WINDOWS: Window[] = ['W', 'M', 'Y']

interface GasUsed {
  timestamp: number
  total_gas_used: number
  avg_gas_used: number
  median_gas_used: number
}

interface GasUsedChartResponse {
  data: GasUsed[]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const chain = (event.pathParameters?.chain || '') as Chain
  const chainId = chainById[chain]?.chainId
  if (chainId == null) {
    return badRequest('Unsupported chain')
  }

  const window = (event.queryStringParameters?.w || 'M') as Window
  if (!WINDOWS.includes(window)) {
    return badRequest('Unsupported window')
  }

  try {
    const gasPrices = await selectGasPriceChart(client, chainId, window)

    const response: GasUsedChartResponse = {
      data: gasPrices.map((gasUsed) => ({
        timestamp: Math.floor(gasUsed.day.getTime() / 1000),
        total_gas_used: gasUsed.total_gas_used,
        avg_gas_used: gasUsed.avg_gas_used,
        median_gas_used: gasUsed.median_gas_used,
      })),
    }

    return success(response, { maxAge: 50 * 60 })
  } catch (error) {
    console.error('Failed to gas price chart', { error })
    return serverError('Failed to get gas price chart')
  }
}

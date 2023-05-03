import type { Window } from '@db/gas-price'
import { selectGasPriceChart } from '@db/gas-price'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import type { Chain } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const SUPPORTED_CHAINS: Chain[] = ['ethereum']

const WINDOWS: Window[] = ['D', 'W', 'M', 'Y']

interface GasPrice {
  timestamp: number
  minGasPrice: number
  medianGasPrice: number
}

interface GasPriceChartResponse {
  data: GasPrice[]
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const chain = (event.pathParameters?.chain || '') as Chain
  if (!SUPPORTED_CHAINS.includes(chain)) {
    return badRequest('Unsupported chain')
  }

  const window = (event.queryStringParameters?.w || 'D') as Window
  if (!WINDOWS.includes(window)) {
    return badRequest('Unsupported window')
  }

  const client = await pool.connect()

  try {
    const gasPrices = await selectGasPriceChart(client, chain, window)

    const response: GasPriceChartResponse = {
      data: gasPrices.map((gasPrice) => ({
        timestamp: Math.floor(gasPrice.timestamp.getTime() / 1000),
        minGasPrice: gasPrice.minGasPrice,
        medianGasPrice: gasPrice.medianGasPrice,
      })),
    }

    return success(response, { maxAge: 50 * 60 })
  } catch (error) {
    console.error('Failed to gas price chart', { error })
    return serverError('Failed to get gas price chart')
  } finally {
    client.release(true)
  }
}

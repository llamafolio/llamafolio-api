import { selectGasPriceChart } from '@db/gas-price'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { Chain } from '@lib/chains'
import { APIGatewayProxyHandler } from 'aws-lambda'

const SUPPORTED_CHAINS: Chain[] = ['ethereum']

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const chain = (event.pathParameters?.chain || '') as Chain
  if (!SUPPORTED_CHAINS.includes(chain)) {
    return badRequest('Unsupported chain')
  }

  const client = await pool.connect()

  try {
    const gasPrices = await selectGasPriceChart(client, chain)

    return success({ data: gasPrices }, { maxAge: 50 * 60 })
  } catch (error) {
    console.error('Failed to gas price chart', { error })
    return serverError('Failed to get gas price chart')
  } finally {
    client.release(true)
  }
}

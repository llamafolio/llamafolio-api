import { client as redisClient } from '@db/redis'
import { replaceYields } from '@db/yields'
import { STAGE } from '@env'
import { serverError, success } from '@handlers/response'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { APIGatewayProxyHandler } from 'aws-lambda'
import fetch from 'node-fetch'

export interface YieldOld {
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apyBase: number | null
  apyReward: number | null
  apy: number
  rewardTokens: string[] | null
  pool: string
  pool_old: string
  apyPct1D: number | null
  apyPct7D: number | null
  apyPct30D: number | null
  stablecoin: boolean
  ilRisk: string
  exposure: string
  predictions: object
  poolMeta: null | string
  mu: number
  sigma: number
  count: number
  outlier: boolean
  underlyingTokens: string[] | null
  il7d: number | null
  apyBase7d: number | null
  apyMean30d: number
  volumeUsd1d: number | null
  volumeUsd7d: number | null
}

export interface YieldOldResponse {
  status: string
  data: YieldOld[]
}

export async function fetchYields() {
  const yieldsRes = await fetch('https://yields.llama.fi/poolsOld')
  const yields: YieldOldResponse = await yieldsRes.json()
  return yields.data
}

const updateYields: APIGatewayProxyHandler = async () => {
  // run in a Lambda because of APIGateway timeout
  await invokeLambda(`llamafolio-api-${STAGE}-updateYields`, {}, 'Event')

  return success({})
}

export const scheduledUpdateYields = wrapScheduledLambda(updateYields)
export const handleUpdateYields = updateYields

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  try {
    const yields = await fetchYields()

    await replaceYields(redisClient, yields)

    console.log(`Inserted ${yields.length} yields`)

    return success({})
  } catch (e) {
    console.error('Failed to update yields', e)
    return serverError('Failed to update yields')
  }
}

import { badRequest, serverError, success } from '@handlers/response'
import { defiLamaYieldMatcher } from '@lib/yield-matcher'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { isAddress } from 'viem'

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  try {
    const address = event.pathParameters?.address
    if (!address) {
      return badRequest('Missing address parameter')
    }
    if (!isAddress(address)) {
      return badRequest('Invalid address parameter, expected hex')
    }
    const yieldBalances = await defiLamaYieldMatcher({ address })

    return success(yieldBalances, { maxAge: 30 * 60 })
  } catch (error) {
    console.error('Failed to get user yield balances', { error })
    return serverError('Failed to get user yield balances')
  } finally {
    console.log('[getBalancesYields] request took', context.getRemainingTimeInMillis() / 1000, 'seconds')
  }
}

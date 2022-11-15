import { adapters } from '@adapters/index'
import { success } from '@handlers/response'
import { chains } from '@lib/chains'
import { sum } from '@lib/math'
import { chains as tokensByChain } from '@llamafolio/tokens'
import { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get stats on supported protocols, chains and tokens
 */
export const handler: APIGatewayProxyHandler = async () => {
  return success(
    {
      data: {
        protocols: adapters.length,
        chains: chains.length,
        tokens: sum(Object.values(tokensByChain).map((tokens) => tokens.length)),
      },
    },
    { maxAge: 10 * 60 },
  )
}

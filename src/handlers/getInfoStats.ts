import { countAdapters } from '@db/adapters'
import { connect } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import { chains } from '@lib/chains'
import { sum } from '@lib/math'
import { chains as tokensByChain } from '@llamafolio/tokens'
import type { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get stats on supported protocols, chains and tokens
 */
export const handler: APIGatewayProxyHandler = async (_event, _context) => {
  try {
    const client = connect()
    const adaptersCount = await countAdapters(client)

    return success(
      {
        data: {
          protocols: adaptersCount,
          chains: chains.length,
          tokens: sum(Object.values(tokensByChain).map((tokens) => tokens.length)),
        },
      },
      { maxAge: 30 * 60 },
    )
  } catch (error) {
    console.error('Failed to info stats', { error })
    return serverError('Failed to get info stats', { error })
  }
}

import { countAdapters } from '@db/adapters'
import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { chains, getRPCClient } from '@lib/chains'
import { sum } from '@lib/math'
import { sendSlackMessage } from '@lib/slack'
import { chains as tokensByChain } from '@llamafolio/tokens'
import type { APIGatewayProxyHandler } from 'aws-lambda'

/**
 * Get stats on supported protocols, chains and tokens
 */
export const handler: APIGatewayProxyHandler = async (_event, _context) => {
  const baseContext: BaseContext = { chain: 'ethereum', adapterId: '', client: getRPCClient({ chain: 'ethereum' }) }

  try {
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
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to info stats',
      message: (error as any).message,
    })

    return serverError('Failed to get info stats', { error })
  }
}

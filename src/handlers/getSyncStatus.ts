import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { unixFromDateTime } from '@lib/fmt'
import { sendSlackMessage } from '@lib/slack'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  const baseContext: BaseContext = {
    chain: 'ethereum',
    adapterId: '',
    client: getRPCClient({ chain: 'ethereum' }),
  }

  try {
    const lastSyncedBlocksQueryRes = await client.query({
      query: `SELECT "chain", max("number") AS "number", max("timestamp") AS "timestamp" FROM evm_indexer2.blocks GROUP BY "chain";`,
    })

    const lastSyncedBlocksRes = (await lastSyncedBlocksQueryRes.json()) as {
      data: [{ chain: string; count: string; number: string; timestamp: string }]
    }

    const response = lastSyncedBlocksRes.data.map((row) => ({
      chain: parseInt(row.chain),
      blockNumber: parseInt(row.number),
      timestamp: unixFromDateTime(row.timestamp),
    }))

    return success(response, { maxAge: 60 })
  } catch (error) {
    console.error('Failed to retrieve sync status', error)
    await sendSlackMessage(baseContext, {
      level: 'error',
      title: 'Failed to retrieve sync status',
      message: (error as any).message,
    })
    return serverError('Failed to retrieve sync status')
  }
}

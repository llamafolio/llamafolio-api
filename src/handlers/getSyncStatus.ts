import { connect } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const clickhouseClient = connect()

    const lastSyncedBlocksQueryRes = await clickhouseClient.query({
      query: `SELECT chain, count() AS count, max(number) AS max FROM evm_indexer.blocks GROUP BY chain;`,
    })

    const lastSyncedBlocksRes = (await lastSyncedBlocksQueryRes.json()) as {
      data: [{ chain: string; count: string; max: string }]
    }

    const response = lastSyncedBlocksRes.data.map((row) => ({
      chain: parseInt(row.chain),
      max_block_number: parseInt(row.max),
      count_blocks: parseInt(row.count),
    }))

    return success(response, { maxAge: 10 })
  } catch (e) {
    console.error('Failed to retrieve sync status', e)
    return serverError('Failed to retrieve sync status')
  }
}

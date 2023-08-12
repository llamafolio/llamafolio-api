import { connect } from '@db/clickhouse'
import pool from '@db/pool'
import { serverError, success } from '@handlers/response'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const client = await pool.connect()

  try {
    const queryRes = await client.query(
      'select chain, indexed_blocks_amount from chains_indexed_state order by chain asc;',
    )

    const chainsIndexedState = queryRes.rows.map((row) => ({
      chain: row.chain,
      indexed_blocks_amount: row.indexed_blocks_amount != null ? parseInt(row.indexed_blocks_amount) : 0,
    }))

    return success(chainsIndexedState, { maxAge: 10 })
  } catch (e) {
    console.error('Failed to retrieve sync status', e)
    return serverError('Failed to retrieve sync status')
  } finally {
    client.release(true)
  }
}

export const handlerV1: APIGatewayProxyHandler = async () => {
  try {
    const clickhouseClient = connect()

    const lastSyncedBlocksQueryRes = await clickhouseClient.query({
      query: `select chain, count() as count, max(number) as max from evm_indexer.blocks group by chain;`,
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

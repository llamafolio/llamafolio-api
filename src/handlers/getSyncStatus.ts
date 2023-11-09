import { client } from '@db/clickhouse'
import { serverError, success } from '@handlers/response'
import { unixFromDateTime } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const lastSyncedBlocksQueryRes = await client.query({
      query: `SELECT chain, max(number) AS max FROM evm_indexer2.blocks GROUP BY chain;`,
    })

    const lastSyncedBlocksRes = (await lastSyncedBlocksQueryRes.json()) as {
      data: [{ chain: string; count: string; max: string }]
    }

    const response = lastSyncedBlocksRes.data.map((row) => ({
      chain: parseInt(row.chain),
      max_block_number: parseInt(row.max),
    }))

    return success(response, { maxAge: 60 })
  } catch (e) {
    console.error('Failed to retrieve sync status', e)
    return serverError('Failed to retrieve sync status')
  }
}

export const handlerV1: APIGatewayProxyHandler = async () => {
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
  } catch (e) {
    console.error('Failed to retrieve sync status', e)
    return serverError('Failed to retrieve sync status')
  }
}

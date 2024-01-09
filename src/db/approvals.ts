import type { ClickHouseClient } from '@clickhouse/client'
import { unixFromDateTime } from '@lib/fmt'
import { decodeEventLog, parseAbi } from 'viem'

export async function selectLatestApprovals(
  client: ClickHouseClient,
  chainId: number,
  address: string,
  signature: string,
  limit: number,
  offset: number,
  window: 'd' | 'w' | 'm',
) {
  const hours: { [key in 'd' | 'w' | 'm']: number } = {
    d: 24,
    w: 24 * 7,
    m: 24 * 30,
  }

  const interval = hours[window] || 24

  const queryRes = await client.query({
    query: `
    WITH "latest_approvals" AS (
      SELECT
        "timestamp",
        "transaction_hash",
        "log_index",
        ("topic0", "topic1", "topic2", "topic3") AS "topics",
        "data"
    FROM evm_indexer2.logs
    WHERE
      "chain" = {chainId: UInt64} AND
      "timestamp" >= now() - interval {interval: UInt16} hour AND
      "address_short" = substring({address: String}, 1, 10) AND
      "address" = {address: String} AND
      "signature" = {signature: String}
    GROUP BY "timestamp", "transaction_hash", "log_index", "data", "topics"
    ),
    (
      SELECT count() FROM "latest_approvals"
    ) AS "count",
    (
      SELECT max("timestamp") FROM evm_indexer2.blocks
      WHERE "chain" = {chainId: UInt64}
    ) AS "updated_at"
    SELECT
      *,
      "count",
      "updated_at"
    FROM "latest_approvals"
    ORDER BY "timestamp" DESC
    LIMIT {limit: UInt8}
    OFFSET {offset: UInt32};
    `,
    query_params: {
      chainId,
      address,
      signature,
      limit,
      offset,
      interval,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      timestamp: string
      transaction_hash: string
      log_index: string
      topics: `0x${string}`[]
      data: `0x${string}`
      count: string
      updated_at: string
    }[]
  }

  return res.data.map((row) => ({
    transactionHash: row.transaction_hash,
    logIndex: parseInt(row.log_index),
    data: decodeApprovals(row.data, row.topics),
    count: parseInt(row.count),
    timestamp: unixFromDateTime(row.timestamp),
    updatedAt: unixFromDateTime(row.updated_at),
  }))
}

function decodeApprovals(data: `0x${string}`, topics: any) {
  return decodeEventLog({
    abi: parseAbi(['event Approval(address indexed, address indexed, uint256)']),
    data,
    topics,
  })
}

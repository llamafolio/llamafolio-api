import type { ClickHouseClient } from '@clickhouse/client'
import { unixFromDateTime } from '@lib/fmt'

export async function selectLatestTokensTransfers(
  client: ClickHouseClient,
  chainId: number,
  address: string,
  limit: number,
  offset: number,
) {
  const queryRes = await client.query({
    query: `
      WITH "latest_tokens_transfers" AS (
        SELECT
          "timestamp",
          "transaction_hash",
          "from_address",
          "to_address",
          "value"
      FROM evm_indexer2.token_transfers
      WHERE
        "chain" = {chainId: UInt64} AND
        "timestamp" >= now() - interval 24 hour AND
        "address_short" = substring({address: String}, 1, 10) AND
        "address" = {address: String}
      GROUP BY "timestamp", "transaction_hash", "from_address", "to_address", "value"
      ),
      (
        SELECT count() FROM "latest_tokens_transfers"
      ) AS "count"
      SELECT
        *,
        "count"
      FROM "latest_tokens_transfers"
      ORDER BY "timestamp" DESC
      LIMIT {limit: UInt8}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      chainId,
      address,
      limit,
      offset,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      timestamp: string
      transaction_hash: string
      from_address: string
      to_address: string
      value: string
      count: string
    }[]
  }

  return res.data.map((row) => ({
    transactionHash: row.transaction_hash,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    amount: row.value,
    count: parseInt(row.count),
    timestamp: unixFromDateTime(row.timestamp),
  }))
}

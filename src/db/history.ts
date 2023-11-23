import type { ClickHouseClient } from '@clickhouse/client'
import { chainById } from '@lib/chains'
import { shortAddress, toDateTime } from '@lib/fmt'
import { isNotNullish } from '@lib/type'

export interface IHistoryTransaction {
  block_number: number
  chain: string
  from: string
  to: string
  gas_price: string
  gas: number
  hash: string
  status: string
  value: string
  timestamp: string
  adapter_ids?: string[]
  method_name?: string
  count: string
  // [from_address, to_address, address, log_index, type, value, id]
  token_transfers: [`0x${string}`, `0x${string}`, `0x${string}`, number, string, string, string | undefined][]
}

export async function selectHistory(
  client: ClickHouseClient,
  addresses: string[],
  limit: number,
  offset: number,
  fromDate: Date,
  toDate: Date,
  chains: string[],
  protocols: string[],
) {
  const chainIds = chains.map((chain) => chainById[chain]?.chainId).filter(isNotNullish)

  const queryRes = await client.query({
    query: `
      WITH "sub_transactions_from" AS (
        SELECT
          "block_number",
          "chain",
          "from_address",
          "to_address",
          substring("input", 1, 10) AS "selector",
          "hash",
          "gas",
          "gas_price",
          "status",
          "value",
          "timestamp",
          arrayMap(x -> (
            JSONExtractString(x, 'from_address'),
            JSONExtractString(x, 'to_address'),
            JSONExtractString(x, 'address'),
            JSONExtractUInt(x, 'log_index'),
            JSONExtractInt(x, 'type'),
            JSONExtractUInt(x, 'value'),
            JSONExtractUInt(x, 'id')
          ), "token_transfers") AS "token_transfers"
        FROM evm_indexer2.transactions_from_mv
        WHERE
          "from_short" IN {addressesShort: Array(String)} AND
          "from_address" IN {addresses: Array(String)} AND
          "timestamp" <= {toTimestamp: DateTime} AND
          "timestamp" >= {fromTimestamp: DateTime}
          ${chainIds.length > 0 ? 'AND "chain" IN {chainIds: Array(UInt64)}' : ''}
        ORDER BY "from_short", "from_address", "timestamp" DESC
        SETTINGS optimize_read_in_order = 1
      ),
      "sub_transactions_to" AS (
        SELECT
          "block_number",
          "chain",
          "from_address",
          "to_address",
          substring("input", 1, 10) AS "selector",
          "hash",
          "gas",
          "gas_price",
          "status",
          "value",
          "timestamp",
          [] AS "token_transfers"
        FROM evm_indexer2.transactions_to_mv
        WHERE
          "to_short" IN {addressesShort: Array(String)} AND
          "to_address" IN {addresses: Array(String)} AND
          "timestamp" <= {toTimestamp: DateTime} AND
          "timestamp" >= {fromTimestamp: DateTime} AND
          "value" > 0
        ORDER BY "to_short", "to_address", "timestamp" DESC
        SETTINGS optimize_read_in_order = 1
      ),
      "sub_token_transfers_to" AS (
        SELECT
          0 AS "block_number",
          "chain",
          '' AS "from_address",
          '' AS "to_address",
          '' AS "selector",
          "transaction_hash" AS "hash",
          0 AS "gas",
          0 AS "gas_price",
          1 AS "status",
          0 AS "value",
          "timestamp",
          groupArray(("from_address", "to_address", "address", "log_index", "type", "value", "id")) as "token_transfers"
        FROM (
          SELECT
            "chain",
            "transaction_hash",
            "timestamp",
            "from_address",
            "to_address",
            "address",
            "log_index",
            "type",
            "value",
            "id"
          FROM evm_indexer2.token_transfers_to_mv
          WHERE
            "to_short" IN {addressesShort: Array(String)} AND
            "to_address" IN {addresses: Array(String)} AND
            "timestamp" <= {toTimestamp: DateTime} AND
            "timestamp" >= {fromTimestamp: DateTime} AND
            ("chain", "transaction_hash") NOT IN (
                SELECT "chain", "hash" FROM "sub_transactions_from"
            )
          ORDER BY "to_short", "to_address", "timestamp" DESC
          LIMIT {limit: UInt8} BY "chain", "transaction_hash", "timestamp"
          SETTINGS optimize_read_in_order = 1, optimize_aggregation_in_order = 1
        )
        GROUP BY "chain", "transaction_hash", "timestamp"
      ),
      "sub_methods" AS (
        SELECT "selector", "name" FROM lf.methods2
        WHERE
          "selector" IN (
            SELECT "selector" FROM "sub_transactions_from"
          )
        GROUP BY "selector", "name"
      )
      SELECT
        t."block_number" AS "block_number",
        t."chain" AS "chain",
        t."from_address" AS "from",
        t."to_address" AS "to",
        t."selector" AS "selector",
        t."hash" AS "hash",
        t."gas" AS "gas",
        t."gas_price" AS "gas_price",
        t."status" AS "status",
        t."value" AS "value",
        t."timestamp" AS "timestamp",
        t."token_transfers" AS "token_transfers",
        m."name" AS "method_name",
        count() OVER() AS "count"
      FROM (
        (SELECT * FROM "sub_transactions_from")
          UNION ALL
        (SELECT * FROM "sub_transactions_to")
          UNION ALL
        (SELECT * FROM "sub_token_transfers_to")
      ) AS "t"
      LEFT JOIN "sub_methods" AS "m" ON m."selector" = t."selector"
      ORDER BY "timestamp" DESC
      LIMIT {limit: UInt8}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      addresses,
      addressesShort: addresses.map(shortAddress),
      limit,
      offset,
      fromTimestamp: toDateTime(fromDate),
      toTimestamp: toDateTime(toDate),
      chainIds,
      // TODO: protocol filter
      protocols,
    },
  })

  const res = (await queryRes.json()) as {
    data: IHistoryTransaction[]
  }

  return res.data
}

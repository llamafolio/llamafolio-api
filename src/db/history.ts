import type { ClickHouseClient } from '@clickhouse/client'
import { chainById } from '@lib/chains'
import { toDateTime } from '@lib/fmt'
import { isNotNullish } from '@lib/type'

export interface IHistoryTransaction {
  total: string
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
  token_transfers: [
    string,
    string,
    string,
    number,
    string,
    string,
    string | undefined,
    number | undefined,
    string | undefined,
    string | undefined,
  ][]
}

export async function selectHistory(
  client: ClickHouseClient,
  address: string,
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
      WITH "sub_history" AS (
        SELECT "chain", "hash", "timestamp"
        FROM evm_indexer.transactions_history_agg
        WHERE
          "target" = {address: String} AND
          ${chainIds.length > 0 ? ' "chain" IN {chainIds: Array(UInt64)} AND' : ''}
          "timestamp" <= {toTimestamp: DateTime} AND
          "timestamp" >= {fromTimestamp: DateTime}
        ORDER BY "timestamp" DESC
        LIMIT {limit: UInt8} BY "chain", "hash"
        LIMIT {limit: UInt8}
        OFFSET {offset: UInt16}
        SETTINGS optimize_read_in_order=1
      ),
      "sub_transactions" AS (
        SELECT
          t."block_number" AS "block_number",
          t."chain" AS "chain",
          t."from" AS "from",
          t."to" AS "to",
          substring(t."input", 1, 10) AS "selector",
          t."hash" AS "hash",
          t."gas" AS "gas",
          t."gas_price" AS "gas_price",
          t."status" AS "status",
          t."value" AS "value",
          t."timestamp" AS "timestamp"
        FROM evm_indexer.transactions AS "t"
        WHERE
          (t."chain", t."hash", t."timestamp") IN "sub_history"
      ),
      "sub_adapters_contracts" AS (
        SELECT
          "chain",
          "address",
          groupArray("adapter_id") AS "adapter_ids"
        FROM lf.adapters_contracts
        WHERE
          "adapter_id" <> 'wallet' AND
          ("chain", "address") IN (
            SELECT "chain", "to" FROM "sub_transactions"
          )
        GROUP BY "chain", "address"
      ),
      "sub_token_transfers" AS (
        SELECT
          tt."chain" AS "chain",
          tt."transaction_hash" AS "hash",
          groupArray((tt."from", tt."to", tt."address", tt."log_index", tt."type", tt."value", tt."id", tk."decimals", tk."symbol", tk."name")) AS "token_transfers"
        FROM evm_indexer.token_transfers AS "tt"
        LEFT JOIN evm_indexer.tokens AS "tk" ON (tk."chain", tk."address") = (tt."chain", tt."address")
        WHERE
          (tt."chain", tt."transaction_hash", tt."timestamp") IN "sub_history" AND
          (tt."from" = {address: String} OR tt."to" = {address: String})
        GROUP BY tt."chain", tt."transaction_hash"
      ),
      (
        SELECT count(*) FROM evm_indexer.transactions_history_agg
        WHERE
          "target" = {address: String} AND
          ${chainIds.length > 0 ? ' "chain" IN {chainIds: Array(UInt64)} AND' : ''}
          "timestamp" <= {toTimestamp: DateTime} AND
          "timestamp" >= {fromTimestamp: DateTime}
      ) AS "total"
      SELECT
        t."block_number" AS "block_number",
        t."chain" AS "chain",
        t."from" AS "from",
        t."to" AS "to",
        t."selector" AS "selector",
        t."hash" AS "hash",
        t."gas" AS "gas",
        t."gas_price" AS "gas_price",
        t."status" AS "status",
        t."value" AS "value",
        t."timestamp" AS "timestamp",
        ac."adapter_ids" AS "adapter_ids",
        m."name" AS "method_name",
        tt."token_transfers" AS "token_transfers",
        "total"
      FROM "sub_transactions" AS "t"
      LEFT JOIN sub_adapters_contracts AS "ac" ON (t."chain", t."to") = (ac."chain", ac."address")
      LEFT JOIN "sub_token_transfers" AS "tt" ON (t."chain", t."hash") = (tt."chain", tt."hash")
      LEFT JOIN lf.methods AS "m" ON m."selector" = t."selector"
      ORDER BY "timestamp" DESC;
    `,
    query_params: {
      address: address.toLowerCase(),
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

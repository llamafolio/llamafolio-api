import type { ClickHouseClient } from '@clickhouse/client'

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
  token_transfers: [string, string, string, number, string, string, string | null][]
}

export async function selectHistory(
  client: ClickHouseClient,
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
) {
  // TODO: contract interacted -> adapter_id
  const queryRes = await client.query({
    query: `
      WITH "all_transactions" AS (
        SELECT "chain", "hash", "timestamp"
        FROM evm_indexer.transactions_history_agg
        WHERE "target" = {address: String}
      ),
      (
        SELECT count(*) FROM "all_transactions"
      ) AS "total",
      "transactions" AS (
        SELECT * FROM "all_transactions"
        ORDER BY "timestamp" DESC
        LIMIT {limit: UInt8}
      )
      SELECT
        "block_number",
        "chain",
        "from",
        "to",
        "hash",
        "gas",
        "gas_price",
        "status",
        "value",
        "timestamp",
        tt."transfers" AS "token_transfers",
        "total"
      FROM evm_indexer.transactions AS "t"
      LEFT JOIN (
        SELECT
          "chain",
          "transaction_hash" AS "hash",
          "timestamp",
          groupArray(("from", "to", "address", "log_index", "type", "value", "id")) AS "transfers"
        FROM evm_indexer.token_transfers
        WHERE
          ("chain", "hash", "timestamp") IN "transactions"
        GROUP BY "chain", "hash", "timestamp"
      ) AS "tt"
      ON (t."chain", t."hash", t."timestamp") = (tt."chain", tt."hash", tt."timestamp")
      WHERE ("chain", "hash", "timestamp") IN "transactions";
    `,
    query_params: {
      address: address.toLowerCase(),
      limit,
      offset,
      // TODO: FILTERS
      chainsFilter: chainsFilter.length > 0 ? chainsFilter : true,
      protocolsFilter: protocolsFilter.length > 0 ? protocolsFilter : true,
    },
  })

  const res = (await queryRes.json()) as {
    data: IHistoryTransaction[]
  }

  return res.data
}

export async function selectHistoryMonthlyCount(
  client: ClickHouseClient,
  address: string,
  chainsFilter: string[],
  protocolsFilter: string[],
) {
  const queryRes = await client.query({
    query: `
      SELECT count() AS "count", toYYYYMM("timestamp") AS "month"
      FROM evm_indexer.transactions_history_agg
      WHERE "target" = {address: String}
      GROUP BY "target", toYYYYMM("timestamp")
      ORDER BY "month" ASC
      SETTINGS use_skip_indexes=1;
    `,
    query_params: {
      address: address.toLowerCase(),
      // TODO: FILTERS
      chainsFilter: chainsFilter.length > 0 ? chainsFilter : true,
      protocolsFilter: protocolsFilter.length > 0 ? protocolsFilter : true,
    },
  })

  const res = (await queryRes.json()) as {
    data: { count: string; month: number }[]
  }

  return res.data.map((row) => ({ count: parseInt(row.count), month: row.month }))
}

import type { ClickHouseClient } from '@clickhouse/client'

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
      WITH "transactions" AS (
        SELECT "chain", "hash", "timestamp"
        FROM (
          (
            SELECT "chain", "hash", "timestamp"
            FROM evm_indexer.transactions_history_mv
            WHERE "target" = {address: String}
          )
            UNION ALL
          (
            SELECT "chain", "hash", "timestamp"
            FROM evm_indexer.token_transfers_history_mv
            WHERE "to" = {address: String}
          )
        )
        GROUP BY "chain", "hash", "timestamp"
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
        tt."transfers" AS "token_transfers"
      FROM evm_indexer.transactions AS "t"
      LEFT JOIN (
        SELECT
          "chain",
          "transaction_hash" AS "hash",
          "timestamp",
          groupArray(("from", "to", "address", "log_index", "type", "value", "id")) AS "transfers"
        FROM (
          (
            SELECT
              "chain",
              "transaction_hash",
              "timestamp",
              "from",
              "to",
              "address",
              "log_index",
              "type",
              "value",
              "id"
            FROM evm_indexer.token_transfers
            WHERE "from" = {address: String}
          )
            UNION ALL
          (
            SELECT
              "chain",
              "transaction_hash",
              "timestamp",
              "from",
              "to",
              "address",
              "log_index",
              "type",
              "value",
              "id"
            FROM evm_indexer.token_transfers
            WHERE "to" = {address: String}
          )
        )
        WHERE ("chain", "hash", "timestamp") IN "transactions"
        GROUP BY "chain", "hash", "timestamp"
      ) AS "tt" ON (t."chain", t."hash", t."timestamp") = (tt."chain", tt."hash", tt."timestamp")
      WHERE ("chain", "hash", "timestamp") IN "transactions"
      SETTINGS max_threads = 16;
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

export async function selectHistoryCount(
  client: ClickHouseClient,
  address: string,
  chainsFilter: string[],
  protocolsFilter: string[],
) {
  const queryRes = await client.query({
    query: `
      SELECT count() AS count FROM (
        SELECT "chain", "hash" FROM (
          (
            SELECT "chain", "hash"
            FROM evm_indexer.transactions_history_mv
            WHERE "target" = {address: String}
          )
            UNION ALL
          (
            SELECT "chain", "hash"
            FROM evm_indexer.token_transfers_history_mv
            WHERE "to" = {address: String}
          )
        )
        GROUP BY "chain", "hash"
      );
    `,
    query_params: {
      address: address.toLowerCase(),
      // TODO: FILTERS
      chainsFilter: chainsFilter.length > 0 ? chainsFilter : true,
      protocolsFilter: protocolsFilter.length > 0 ? protocolsFilter : true,
    },
  })

  const res = (await queryRes.json()) as {
    data: [{ count: string }]
  }

  return res.data[0]?.count ? parseInt(res.data[0].count) : 0
}

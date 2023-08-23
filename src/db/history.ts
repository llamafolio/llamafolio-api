import type { ClickHouseClient } from '@clickhouse/client'

export interface IHistoryTransaction {
  contract_interacted?: {
    contract: string
    adapter?: { adapter_id?: string }
  }
  block_number: string
  chain: string
  from_address: string
  gas_price: string
  gas: string
  hash: string
  method_name?: {
    name: string
  }
  receipt: {
    status: string
  }
  timestamp: string
  to_address: string
  erc20_transfers_aggregate: {
    nodes: {
      from_address: string
      to_address: string
      log_index: number
      token: string
      value: string
      token_details?: {
        decimals: number
        name: string
        symbol: string
      }
    }[]
  }
  value: string
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
        SELECT "chain", "hash"
        FROM (
          (
            SELECT "chain", "hash", "timestamp"
            FROM evm_indexer.transactions_history_mv
            WHERE "target" = {address: String}
            ORDER BY "timestamp" DESC
          )
            UNION ALL
          (
            SELECT "chain", "transaction_hash" AS "hash", "timestamp"
            FROM evm_indexer.token_transfers_history_mv
            WHERE "to" = {address: String}
            ORDER BY "timestamp" DESC
          )
        )
        ORDER BY "timestamp" DESC
        LIMIT {limit: UInt8}
      )
      SELECT
        "chain",
        "from",
        "to",
        "hash",
        "timestamp",
        tt."type" AS "tt_type",
        tt."address" AS "tt_token"
      FROM evm_indexer.transactions AS "t"
      LEFT JOIN (
        SELECT "chain", "transaction_hash" AS "hash", "type", "address"
        FROM evm_indexer.token_transfers
        WHERE ("chain", "hash") IN "transactions"
      ) AS "tt" ON (t."chain", t."hash") = (tt."chain", tt."hash")
      WHERE ("chain", "hash") IN "transactions;"
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
      SELECT count() FROM (
        (
          SELECT "chain", "hash"
          FROM evm_indexer.transactions_history_mv
          WHERE "target" = '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'
        )
          UNION ALL
        (
          SELECT "chain", "hash"
          FROM evm_indexer.token_transfers_history_mv
          WHERE "to" = '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'
        )
      )
      GROUP BY "chain", "hash";
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

import type { PoolClient } from 'pg'

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
  client: PoolClient,
  address: string,
  limit: number,
  offset: number,
  chainsFilter: string[],
  protocolsFilter: string[],
) {
  const queryRes = await client.query(
    `
  SELECT
  coalesce(
    json_agg(
      "root"
      ORDER BY
        "root.pg.timestamp" DESC NULLS FIRST
    ),
    '[]'
  ) AS "root"
FROM
  (
    SELECT
      row_to_json(
        (
          SELECT
            "_e"
          FROM
            (
              SELECT
                "_root.ar.root.adapters_contracts"."adapters_contracts" AS "adapters_contracts",
                "_root.base"."block_number" AS "block_number",
                "_root.base"."chain" AS "chain",
                "_root.base"."from_address" AS "from_address",
                "_root.base"."gas_price" AS "gas_price",
                "_root.base"."gas" AS "gas",
                "_root.base"."hash" AS "hash",
                "_root.or.method_name"."method_name" AS "method_name",
                "_root.or.receipt"."receipt" AS "receipt",
                "_root.base"."timestamp" AS "timestamp",
                "_root.base"."to_address" AS "to_address",
                "_root.ar.root.erc20_transfers_aggregate"."erc20_transfers_aggregate" AS "erc20_transfers_aggregate",
                "_root.base"."value" AS "value"
            ) AS "_e"
        )
      ) AS "root",
      "_root.base"."timestamp" AS "root.pg.timestamp"
    FROM
      (
        SELECT
          *
        FROM
          "public"."transactions"
        WHERE
          (
            ("public"."transactions"."from_address") = ($1 :: text)
            ${
              chainsFilter.length > 0
                ? `AND (
              ("public"."transactions"."chain") = ANY ($4 :: string[])
            )`
                : 'AND ($4 :: boolean)'
            }
            ${
              protocolsFilter.length > 0
                ? `AND (
                    EXISTS (
                      SELECT
                        1
                      FROM
                        "public"."adapters_contracts" ac
                      WHERE
                        ac.address = ("public"."transactions"."to_address")
                        AND ac.chain = ("public"."transactions"."chain")
                        AND ac.adapter_id = ANY ($5 :: string[])
                    )
            )`
                : 'AND ($5 :: boolean)'
            }
          )
        ORDER BY
          "timestamp" DESC NULLS FIRST
        LIMIT
          $2 :: int OFFSET $3 :: int
      ) AS "_root.base"
      LEFT OUTER JOIN LATERAL (
        SELECT
          row_to_json(
            (
              SELECT
                "_e"
              FROM
                (
                  SELECT
                    "_root.or.receipt.base"."status" AS "status"
                ) AS "_e"
            )
          ) AS "receipt"
        FROM
          (
            SELECT
              *
            FROM
              "public"."receipts"
            WHERE
              (("_root.base"."hash") = ("hash"))
            LIMIT
              1
          ) AS "_root.or.receipt.base"
      ) AS "_root.or.receipt" ON ('true')
      LEFT OUTER JOIN LATERAL (
        SELECT
          row_to_json(
            (
              SELECT
                "_e"
              FROM
                (
                  SELECT
                    "_root.or.method_name.base"."name" AS "name"
                ) AS "_e"
            )
          ) AS "method_name"
        FROM
          (
            SELECT
              *
            FROM
              "public"."methods"
            WHERE
              (("_root.base"."method") = ("method"))
            LIMIT
              1
          ) AS "_root.or.method_name.base"
      ) AS "_root.or.method_name" ON ('true')
      LEFT OUTER JOIN LATERAL (
        SELECT
          coalesce(json_agg("adapters_contracts"), '[]') AS "adapters_contracts"
        FROM
          (
            SELECT
              row_to_json(
                (
                  SELECT
                    "_e"
                  FROM
                    (
                      SELECT
                        "_root.ar.root.adapters_contracts.base"."adapter_id" AS "adapter_id"
                    ) AS "_e"
                )
              ) AS "adapters_contracts"
            FROM
              (
                SELECT
                  *
                FROM
                  "public"."adapters_contracts"
                WHERE
                  (
                    (("_root.base"."chain") = ("chain"))
                    AND (("_root.base"."to_address") = ("address"))
                  )
              ) AS "_root.ar.root.adapters_contracts.base"
          ) AS "_root.ar.root.adapters_contracts"
      ) AS "_root.ar.root.adapters_contracts" ON ('true')
      LEFT OUTER JOIN LATERAL (
        SELECT
          json_build_object(
            'nodes',
            coalesce(
              json_agg(
                "nodes"
                ORDER BY
                  "root.ar.root.erc20_transfers_aggregate.pg.log_index" ASC NULLS LAST
              ),
              '[]'
            )
          ) AS "erc20_transfers_aggregate"
        FROM
          (
            SELECT
              "_root.ar.root.erc20_transfers_aggregate.base"."log_index" AS "root.ar.root.erc20_transfers_aggregate.pg.log_index",
              row_to_json(
                (
                  SELECT
                    "_e"
                  FROM
                    (
                      SELECT
                        "_root.ar.root.erc20_transfers_aggregate.base"."from_address" AS "from_address",
                        "_root.ar.root.erc20_transfers_aggregate.base"."to_address" AS "to_address",
                        "_root.ar.root.erc20_transfers_aggregate.base"."log_index" AS "log_index",
                        "_root.ar.root.erc20_transfers_aggregate.base"."token" AS "token",
                        "_root.ar.root.erc20_transfers_aggregate.base"."value" AS "value",
                        "_root.ar.root.erc20_transfers_aggregate.or.token_details"."token_details" AS "token_details"
                    ) AS "_e"
                )
              ) AS "nodes"
            FROM
              (
                SELECT
                  *
                FROM
                  "public"."erc20_transfers"
                WHERE
                  (("_root.base"."hash") = ("hash"))
                ORDER BY
                  "log_index" ASC NULLS LAST
              ) AS "_root.ar.root.erc20_transfers_aggregate.base"
              LEFT OUTER JOIN LATERAL (
                SELECT
                  row_to_json(
                    (
                      SELECT
                        "_e"
                      FROM
                        (
                          SELECT
                            "_root.ar.root.erc20_transfers_aggregate.or.token_details.base"."decimals" AS "decimals",
                            "_root.ar.root.erc20_transfers_aggregate.or.token_details.base"."name" AS "name",
                            "_root.ar.root.erc20_transfers_aggregate.or.token_details.base"."symbol" AS "symbol"
                        ) AS "_e"
                    )
                  ) AS "token_details"
                FROM
                  (
                    SELECT
                      *
                    FROM
                      "public"."erc20_tokens"
                    WHERE
                      (
                        (
                          (
                            "_root.ar.root.erc20_transfers_aggregate.base"."chain"
                          ) = ("chain")
                        )
                        AND (
                          (
                            "_root.ar.root.erc20_transfers_aggregate.base"."token"
                          ) = ("address")
                        )
                      )
                    LIMIT
                      1
                  ) AS "_root.ar.root.erc20_transfers_aggregate.or.token_details.base"
              ) AS "_root.ar.root.erc20_transfers_aggregate.or.token_details" ON ('true')
            ORDER BY
              "root.ar.root.erc20_transfers_aggregate.pg.log_index" ASC NULLS LAST
          ) AS "_root.ar.root.erc20_transfers_aggregate"
      ) AS "_root.ar.root.erc20_transfers_aggregate" ON ('true')
    ORDER BY
      "root.pg.timestamp" DESC NULLS FIRST
  ) AS "_root"
  `,
    [
      address,
      limit,
      offset,
      chainsFilter.length > 0 ? chainsFilter : true,
      protocolsFilter.length > 0 ? protocolsFilter : true,
    ],
  )

  return queryRes.rows[0].root as IHistoryTransaction[]
}

export async function selectHistoryAggregate(
  client: PoolClient,
  address: string,
  chainsFilter: string[],
  protocolsFilter: string[],
) {
  const queryRes = await client.query(
    `
  SELECT
  json_build_object(
    'aggregate',
    json_build_object('count', COUNT(*))
  ) AS "root"
FROM
  (
    SELECT
      1
    FROM
      (
        SELECT
          *
        FROM
          "public"."transactions"
        WHERE
          (
            ("public"."transactions"."from_address") = ($1 :: text)
            ${
              chainsFilter.length > 0
                ? `AND (
              ("public"."transactions"."chain") = ANY ($2 :: string[])
            )`
                : 'AND ($2 :: boolean)'
            }
            ${
              protocolsFilter.length > 0
                ? `AND (
                    EXISTS (
                      SELECT
                        1
                      FROM
                        "public"."adapters_contracts" ac
                      WHERE
                        ac.chain = ("public"."transactions"."chain")
                        AND ac.address = ("public"."transactions"."to_address")
                        AND ac.adapter_id = ANY ($3 :: string[])
                    )
            )`
                : 'AND ($3 :: boolean)'
            }
          )
      ) AS "_root.base"
  ) AS "_root"
  `,
    [address, chainsFilter.length > 0 ? chainsFilter : true, protocolsFilter.length > 0 ? protocolsFilter : true],
  )

  return queryRes.rows[0].root
}

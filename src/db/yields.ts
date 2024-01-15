import type { ClickHouseClient } from '@clickhouse/client'
import { chainById, fromDefiLlamaChain } from '@lib/chains'
import { boolean, toDateTime, unixFromDate, unixFromDateTime } from '@lib/fmt'

export interface YieldOld {
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apyBase: number | null
  apyReward: number | null
  apy: number
  rewardTokens: string[] | null
  pool: string
  pool_old: string
  apyPct1D: number | null
  apyPct7D: number | null
  apyPct30D: number | null
  stablecoin: boolean
  ilRisk: string
  exposure: string
  predictions: object
  poolMeta: null | string
  mu: number
  sigma: number
  count: number
  outlier: boolean
  underlyingTokens: string[] | null
  il7d: number | null
  apyBase7d: number | null
  apyMean30d: number
  volumeUsd1d: number | null
  volumeUsd7d: number | null
}

export interface YieldOldResponse {
  status: string
  data: YieldOld[]
}

/**
 * Extract address from string containing metadata. Ex:
 * "0xd7d069493685a581d27824fc46eda46b7efc0063-binance" -> "0xd7d069493685a581d27824fc46eda46b7efc0063"
 * "TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd" -> "TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd"
 * "ankr-ankrETH" -> "ankr-ankrETH"
 * @param str
 */
function extractAddress(str: string) {
  if (str.startsWith('0x')) {
    return str.split('-')[0]
  }

  return str
}

export async function fetchYields() {
  const yieldsRes = await fetch('https://yields.llama.fi/poolsOld')
  if (!yieldsRes.ok) {
    throw new Error('failed to fetch yields')
  }

  const yields: YieldOldResponse = await yieldsRes.json()

  const now = new Date()
  const data: YieldStorage[] = []

  for (const _yield of yields.data) {
    const chain = chainById[fromDefiLlamaChain[_yield.chain.toLowerCase()]] || chainById[_yield.chain.toLowerCase()]
    if (!chain) {
      continue
    }

    data.push({
      chain: chain.chainId,
      adapter_id: _yield.project,
      address: extractAddress(_yield.pool_old).toLowerCase(),
      pool: _yield.pool,
      apy: _yield.apy,
      apy_base: _yield.apyBase,
      apy_reward: _yield.apyReward,
      apy_mean_30d: _yield.apyMean30d,
      il_risk: boolean(_yield.ilRisk),
      apy_pct_1d: _yield.apyPct1D,
      apy_pct_7d: _yield.apyPct7D,
      apy_pct_30d: _yield.apyPct30D,
      underlyings: (_yield.underlyingTokens || []).map((address) => address.toLowerCase()).sort(),
      timestamp: toDateTime(now),
    })
  }

  return data
}

export interface TokenYield {
  pool: string
  adapterId: string
  address: string
  apy: string | null
  apyBase: string | null
  apyReward: string | null
  apyMean30d: string | null
  ilRisk: boolean | null
  underlyings: { address: string; symbol: string; name: string }[] | null
}

export async function selectTokenYields(
  client: ClickHouseClient,
  chainId: number,
  address: `0x${string}`,
  limit = 25,
  offset = 0,
) {
  const queryRes = await client.query({
    query: `
      WITH "sub_yields" AS (
        WITH (
          SELECT max("timestamp") AS "timestamp" FROM lf.yields
        ) AS "updated_at"
        SELECT
          "chain",
          "adapter_id",
          "address",
          "pool",
          "apy",
          "apy_base",
          "apy_reward",
          "apy_mean_30d",
          "il_risk",
          "underlyings",
          "underlying"
        FROM lf.yields
        LEFT ARRAY JOIN "underlyings" AS "underlying"
        WHERE
          "timestamp" = "updated_at" AND
          "chain" = {chainId: UInt64} AND (
            "address" = {address: String} OR
            has("underlyings", {address: String})
          )
        ORDER BY "apy" DESC
      )
      SELECT
        "chain",
        "adapter_id",
        "address",
        "pool",
        "apy",
        "apy_base",
        "apy_reward",
        "apy_mean_30d",
        "il_risk",
        groupArray(("underlying", "symbol", "name")) as "underlyings"
      FROM "sub_yields" AS "y"
      LEFT JOIN (
        SELECT "address", "symbol", "name" FROM evm_indexer2.tokens
        WHERE
          "chain" = {chainId: UInt64} AND
          "address" IN (
            SELECT "underlying" FROM "sub_yields"
          )
      ) AS "t" ON y.underlying = t.address
      GROUP BY chain, adapter_id, address, pool, apy, apy_base, apy_reward, apy_mean_30d, il_risk
      LIMIT {limit: UInt8}
      OFFSET {offset: UInt32};
    `,
    query_params: {
      address,
      chainId,
      offset,
      limit,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      pool: string
      adapter_id: string
      address: string
      apy: string | null
      apy_base: string | null
      apy_reward: string | null
      apy_mean_30d: string | null
      il_risk: boolean | null
      underlyings: [string, string, string][] | null
      updated_at: string
    }[]
  }

  const data: TokenYield[] = []
  let updatedAt = unixFromDate(new Date())

  for (const row of res.data) {
    updatedAt = unixFromDateTime(row.updated_at)

    data.push({
      pool: row.pool,
      adapterId: row.adapter_id,
      address: row.address,
      apy: row.apy,
      apyBase: row.apy_base,
      apyReward: row.apy_reward,
      apyMean30d: row.apy_mean_30d,
      ilRisk: row.il_risk,
      underlyings: (row.underlyings || []).map(([address, symbol, name]) => ({ address, symbol, name })),
    })
  }

  return { updatedAt, data, count: data.length }
}

export interface YieldStorage {
  chain: number
  adapter_id: string
  address: string
  pool: string
  apy: number
  apy_base: number | null
  apy_reward: number | null
  apy_mean_30d: number
  il_risk: boolean
  apy_pct_1d: number | null
  apy_pct_7d: number | null
  apy_pct_30d: number | null
  underlyings: string[]
  timestamp: string
}

export function insertYields(client: ClickHouseClient, values: YieldStorage[]) {
  if (values.length === 0) {
    return
  }

  return client.insert({
    table: 'lf.yields',
    values,
    format: 'JSONEachRow',
  })
}

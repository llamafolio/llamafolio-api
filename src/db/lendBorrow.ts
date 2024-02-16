import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import { chainByChainId } from '@lib/chains'
import { boolean, safeParseFloat, safeParseInt, unixFromDateTime } from '@lib/fmt'
import type { UnixTimestamp } from '@lib/type'

export interface LendBorrowPoolStorable
  extends Omit<LendBorrowPoolResponse, 'mintedCoin' | 'rewardTokens' | 'underlyingTokens'> {
  chain: number
  adapterId: string
  address: string
  rewards: string[] | null
  underlyings: string[] | null
  timestamp: string
}

interface LendBorrowPoolResponse {
  pool: string
  apyBaseBorrow: number | null
  apyRewardBorrow: number | null
  totalSupplyUsd: number
  totalBorrowUsd: number | null
  debtCeilingUsd: number | null
  ltv: number
  borrowable: boolean | null
  mintedCoin: null | string
  rewardTokens: string[] | null
  underlyingTokens: string[] | null
  borrowFactor: number | null
}

export async function fetchLendBorrowPools() {
  const response = await fetch('https://yields.llama.fi/lendBorrow')

  if (!response.ok) {
    throw new Error('Failed to fetch DefiLlama lend/borrow pools')
  }

  const json: LendBorrowPoolResponse[] = await response.json()

  return json
}

export interface LendBorrowPool {
  chain: string
  chainId: number
  address: string
  pool: string
  adapterId: string
  apyBaseBorrow?: number
  apyRewardBorrow?: number
  totalSupplyUsd?: number
  totalBorrowUsd?: number
  debtCeilingUsd?: number
  borrowFactor?: number
  ltv?: number
  borrowable?: boolean
  symbol?: string
  decimals?: number
  underlyings?: { address: string; symbol: string; decimals?: number }[]
  rewards?: { address: string; symbol: string; decimals?: number }[]
}

export async function selectLendBorrowPools(client: ClickHouseClient, chainId: number, token: string) {
  const queryRes = await client.query({
    query: `
      WITH "pools" AS (
        SELECT
          "chain",
          "address",
          "pool",
          argMax("adapterId", "timestamp") AS "lastAdapterId",
          argMax("apyBaseBorrow", "timestamp") AS "lastApyBaseBorrow",
          argMax("apyRewardBorrow", "timestamp") AS "lastApyRewardBorrow",
          argMax("totalSupplyUsd", "timestamp") AS "lastTotalSupplyUsd",
          argMax("totalBorrowUsd", "timestamp") AS "lastTotalBorrowUsd",
          argMax("debtCeilingUsd", "timestamp") AS "lastDebtCeilingUsd",
          argMax("borrowFactor", "timestamp") AS "lastBorrowFactor",
          argMax("ltv", "timestamp") AS "lastLTV",
          argMax("borrowable", "timestamp") AS "lastBorrowable",
          argMax("underlyings", "timestamp") AS "lastUnderlyings",
          argMax("rewards", "timestamp") AS "lastRewards",
          max("timestamp") AS "lastTimestamp"
        FROM ${environment.NS_LF}.lend_borrow
        WHERE
          "chain" = {chainId: UInt64} AND
          has("underlyings", {token: String})
        GROUP BY "chain", "address", "pool"
      ),
      -- JOIN underlyings + rewards + address
      "pools_underlying" AS (
        SELECT *, "underlying" FROM "pools"
        LEFT ARRAY JOIN "lastUnderlyings" AS "underlying"
      ),
      "pools_underlying_reward" AS (
        SELECT *, "reward" FROM "pools_underlying"
        LEFT ARRAY JOIN "lastRewards" AS "reward"
      )
      SELECT
        p.chain AS "chain",
        p.address AS "address",
        p.pool AS "pool",
        p.lastAdapterId AS "adapterId",
        p.lastApyBaseBorrow AS "apyBaseBorrow",
        p.lastApyRewardBorrow AS "apyRewardBorrow",
        p.lastTotalSupplyUsd AS "totalSupplyUsd",
        p.lastTotalBorrowUsd AS "totalBorrowUsd",
        p.lastDebtCeilingUsd AS "debtCeilingUsd",
        p.lastBorrowFactor AS "borrowFactor",
        p.lastLTV AS "ltv",
        p.lastBorrowable AS "borrowable",
        p.lastTimestamp AS "updatedAt",
        t.symbol AS "symbol",
        t.decimals AS "decimals",
        groupArray((p.underlying, u.symbol, u.decimals)) as "underlyings",
        groupArray((p.reward, r.symbol, r.decimals)) as "rewards"
      FROM "pools_underlying_reward" AS "p"
      LEFT JOIN (
        SELECT
          "chain",
          "address",
          "symbol",
          "decimals"
        FROM evm_indexer2.tokens
        WHERE ("chain", "address") IN (
          SELECT "chain", "address"
          FROM "pools_underlying_reward"
          GROUP BY "chain", "address"
        )
        GROUP BY "chain", "address", "symbol", "decimals"
      ) AS "t"
      ON (p."chain", p."address") = (t."chain", t."address")
      LEFT JOIN (
        SELECT
          "chain",
          "address",
          "symbol",
          "decimals"
        FROM evm_indexer2.tokens
        WHERE ("chain", "address") IN (
          SELECT "chain", "underlying"
          FROM "pools_underlying_reward"
          GROUP BY "chain", "underlying"
        )
        GROUP BY "chain", "address", "symbol", "decimals"
      ) AS "u"
      ON (p."chain", p."underlying") = (u."chain", u."address")
      LEFT JOIN (
        SELECT
          "chain",
          "address",
          "symbol",
          "decimals"
        FROM evm_indexer2.tokens
        WHERE ("chain", "address") IN (
          SELECT "chain", "reward"
          FROM "pools_underlying_reward"
          GROUP BY "chain", "reward"
        )
        GROUP BY "chain", "address", "symbol", "decimals"
      ) AS "r"
      ON (p."chain", p."reward") = (r."chain", r."address")
      GROUP BY
        p.chain,
        p.address,
        p.pool,
        p.lastAdapterId,
        p.lastApyBaseBorrow,
        p.lastApyRewardBorrow,
        p.lastTotalSupplyUsd,
        p.lastTotalBorrowUsd,
        p.lastDebtCeilingUsd,
        p.lastBorrowFactor,
        p.lastLTV,
        p.lastBorrowable,
        p.lastTimestamp,
        t.symbol,
        t.decimals
    `,
    query_params: {
      chainId,
      token,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      address: string
      pool: string
      adapterId: string
      apyBaseBorrow: string | null
      apyRewardBorrow: string | null
      totalSupplyUsd: string | null
      totalBorrowUsd: string | null
      debtCeilingUsd: string | null
      borrowFactor: string | null
      ltv: string | null
      borrowable: boolean | null
      symbol: string | null
      decimals: string | null
      underlyings: [string, string, string][] | null
      rewards: [string, string, string][] | null
      updatedAt: string
    }[]
  }

  const data: LendBorrowPool[] = []
  let updatedAt: UnixTimestamp | undefined

  for (const row of res.data) {
    const chainId = parseInt(row.chain)
    const chain = chainByChainId[chainId]
    if (!chain) {
      continue
    }

    updatedAt = unixFromDateTime(row.updatedAt)

    data.push({
      chain: chain.id,
      chainId,
      address: row.address,
      pool: row.pool,
      adapterId: row.adapterId,
      apyBaseBorrow: safeParseFloat(row.apyBaseBorrow),
      apyRewardBorrow: safeParseFloat(row.apyRewardBorrow),
      totalSupplyUsd: safeParseFloat(row.totalSupplyUsd),
      totalBorrowUsd: safeParseFloat(row.totalBorrowUsd),
      debtCeilingUsd: safeParseFloat(row.debtCeilingUsd),
      borrowFactor: safeParseFloat(row.borrowFactor),
      ltv: safeParseFloat(row.ltv),
      borrowable: boolean(row.borrowable),
      symbol: row.symbol || undefined,
      decimals: safeParseInt(row.decimals),
      underlyings: row.underlyings
        ?.map(([address, symbol, decimals]) => ({
          address,
          symbol,
          decimals: safeParseInt(decimals),
        }))
        ?.filter((underlying) => underlying.address),
      rewards: row.rewards
        ?.map(([address, symbol, decimals]) => ({
          address,
          symbol,
          decimals: safeParseInt(decimals),
        }))
        ?.filter((reward) => reward.address),
    })
  }

  return { updatedAt, data }
}

export function insertLendBorrow(client: ClickHouseClient, values: LendBorrowPoolStorable[]) {
  if (values.length === 0) {
    return
  }

  return client.insert({
    table: `${environment.NS_LF}.lend_borrow`,
    values,
    format: 'JSONEachRow',
  })
}

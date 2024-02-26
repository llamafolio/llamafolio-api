import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import { chainByChainId } from '@lib/chains'
import { safeParseFloat, safeParseInt, unixFromDateTime } from '@lib/fmt'
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

export interface LendPoolStorage {
  chain: string
  chainId: number
  address: string
  pool: string
  adapterId: string
  apyBaseLend?: number
  apyRewardLend?: number
  totalSupplyUsd?: number
  totalBorrowUsd?: number
  debtCeilingUsd?: number
  borrowFactor?: number
  ltv?: number
  borrowable?: boolean
  symbol?: string
  decimals?: number
  underlyings?: string[]
  rewards?: string[]
}

export interface BorrowPoolStorage {
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
  underlyings?: string[]
  rewards?: string[]
}

export async function selectTokenLendPools(client: ClickHouseClient, chainId: number, token: string) {
  const queryRes = await client.query({
    query: `
      WITH "pools" AS (
        SELECT
          "chain",
          "address",
          "pool",
          argMax("adapterId", "timestamp") AS "adapterId",
          argMax("totalSupplyUsd", "timestamp") AS "totalSupplyUsd",
          argMax("totalBorrowUsd", "timestamp") AS "totalBorrowUsd",
          argMax("debtCeilingUsd", "timestamp") AS "debtCeilingUsd",
          argMax("borrowFactor", "timestamp") AS "borrowFactor",
          argMax("ltv", "timestamp") AS "ltv",
          argMax("underlyings", "timestamp") AS "underlyings",
          argMax("rewards", "timestamp") AS "rewards",
          max("timestamp") AS "lastTimestamp"
        FROM ${environment.NS_LF}.lend_borrow
        GROUP BY "chain", "address", "pool"
        HAVING
          "chain" = 1 AND
          (
            "address" = {token: String} OR
            length("underlyings") = 1 AND "underlyings"[1] = {token: String}
          ) AND
          ("borrowable" IS NULL OR NOT "borrowable")
      )
      SELECT
        p.*,
        y.apyBaseLend,
        y.apyRewardLend
      FROM "pools" AS "p"
      INNER JOIN (
        SELECT
          "chain",
          "pool",
          argMax("apy_base", "timestamp") AS "apyBaseLend",
          argMax("apy_reward", "timestamp") AS "apyRewardLend"
        FROM ${environment.NS_LF}.yields
        WHERE ("chain", "pool") IN (
          SELECT "chain", "pool" FROM "pools" GROUP BY "chain", "pool"
        )
        GROUP BY "chain", "pool"
      ) AS "y" ON (p.chain, p.pool) = (y.chain, y.pool)
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
      apyBaseLend: string | null
      apyRewardLend: string | null
      totalSupplyUsd: string | null
      totalBorrowUsd: string | null
      debtCeilingUsd: string | null
      borrowFactor: string | null
      ltv: string | null
      borrowable: boolean | null
      symbol: string | null
      decimals: string | null
      underlyings: string[] | null
      rewards: string[] | null
      updatedAt: string
    }[]
  }

  const data: LendPoolStorage[] = []
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
      apyBaseLend: safeParseFloat(row.apyBaseLend),
      apyRewardLend: safeParseFloat(row.apyRewardLend),
      totalSupplyUsd: safeParseFloat(row.totalSupplyUsd),
      totalBorrowUsd: safeParseFloat(row.totalBorrowUsd),
      debtCeilingUsd: safeParseFloat(row.debtCeilingUsd),
      borrowFactor: safeParseFloat(row.borrowFactor),
      ltv: safeParseFloat(row.ltv),
      decimals: safeParseInt(row.decimals),
      underlyings: row.underlyings || undefined,
      rewards: row.rewards || undefined,
    })
  }

  return { updatedAt, data }
}

export async function selectTokenBorrowPools(client: ClickHouseClient, chainId: number, token: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "address",
        "pool",
        argMax("adapterId", "timestamp") AS "adapterId",
        argMax("apyBaseBorrow", "timestamp") AS "apyBaseBorrow",
        argMax("apyRewardBorrow", "timestamp") AS "apyRewardBorrow",
        argMax("totalSupplyUsd", "timestamp") AS "totalSupplyUsd",
        argMax("totalBorrowUsd", "timestamp") AS "totalBorrowUsd",
        argMax("debtCeilingUsd", "timestamp") AS "debtCeilingUsd",
        argMax("borrowFactor", "timestamp") AS "borrowFactor",
        argMax("ltv", "timestamp") AS "ltv",
        argMax("underlyings", "timestamp") AS "underlyings",
        argMax("rewards", "timestamp") AS "rewards",
        max("timestamp") AS "lastTimestamp"
      FROM ${environment.NS_LF}.lend_borrow
      GROUP BY "chain", "address", "pool"
      HAVING
        "chain" = {chainId: UInt64} AND
        (
          "address" = {token: String} OR
          length("underlyings") = 1 AND "underlyings"[1] = {token: String}
        ) AND
        "borrowable"
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
      symbol: string | null
      decimals: string | null
      underlyings: string[] | null
      rewards: string[] | null
      updatedAt: string
    }[]
  }

  const data: BorrowPoolStorage[] = []
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
      underlyings: row.underlyings || undefined,
      rewards: row.rewards || undefined,
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

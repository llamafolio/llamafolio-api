import type { ClickHouseClient } from '@clickhouse/client'
import { chainById, fromDefiLlamaChain } from '@lib/chains'
import { boolean, toDateTime } from '@lib/fmt'
import { extractAddress } from '@lib/yields'

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

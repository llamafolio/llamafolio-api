import type { ClickHouseClient } from '@clickhouse/client'
import { environment } from '@environment'
import { type Chain, chainByChainId, chainById } from '@lib/chains'
import { fromDateTime, toDateTime } from '@lib/fmt'
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
  const url = environment.CLOUDFLARE_R2_PUBLIC_URL
    ? `${environment.CLOUDFLARE_R2_PUBLIC_URL}/yield/llama_yields_pools_old.json`
    : 'https://yields.llama.fi/poolsOld'
  const yieldsRes = await fetch(url)
  if (!yieldsRes.ok) {
    throw new Error('failed to fetch yields')
  }

  const yields: YieldOldResponse = await yieldsRes.json()

  return yields.data.map(({ project, underlyingTokens, ...data }) => ({
    ...data,
    chain: data.chain.toLowerCase() as Chain,
    address: extractAddress(data.pool_old),
    adapterId: project,
    underlyings: underlyingTokens?.map((token) => token.toLowerCase()) || null,
  }))
}

export interface Yield {
  chain: Chain
  adapterId: string
  address: string
  pool: string
  apy: number
  apyBase?: number
  apyReward?: number
  apyMean30d: number
  ilRisk: boolean
  apyPct1D?: number
  apyPct7D?: number
  apyPct30D?: number
  underlyings?: string[]
  updatedAt: Date
}

export interface YieldStorage {
  chain: string
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
  underlyings: string[] | null
  updated_at: string
}

export interface YieldStorable {
  chain: Chain
  adapterId: string
  address: string
  pool: string
  apy: number
  apyBase: number | null
  apyReward: number | null
  apyMean30d: number
  ilRisk: any
  apyPct1D: number | null
  apyPct7D: number | null
  apyPct30D: number | null
  underlyings: string[] | null
  updated_at: string
}

export function fromStorage(yieldsStorage: YieldStorage[]) {
  const yields: Yield[] = []

  for (const yieldStorage of yieldsStorage) {
    const chain = chainByChainId[parseInt(yieldStorage.chain)]
    if (!chain) {
      continue
    }

    const _yield: Yield = {
      chain: yieldStorage.chain as Chain,
      adapterId: yieldStorage.adapter_id,
      address: yieldStorage.address,
      pool: yieldStorage.pool,
      apy: yieldStorage.apy,
      apyBase: yieldStorage.apy_base ?? undefined,
      apyReward: yieldStorage.apy_reward ?? undefined,
      apyMean30d: yieldStorage.apy_mean_30d,
      ilRisk: yieldStorage.il_risk,
      apyPct1D: yieldStorage.apy_pct_1d ?? undefined,
      apyPct7D: yieldStorage.apy_pct_7d ?? undefined,
      apyPct30D: yieldStorage.apy_mean_30d,
      underlyings: yieldStorage.underlyings ?? undefined,
      updatedAt: fromDateTime(yieldStorage.updated_at),
    }

    yields.push(_yield)
  }

  return yields
}

export function toStorage(yields: Yield[]) {
  const yieldsStorage: YieldStorage[] = []

  for (const _yield of yields) {
    const chainId = chainById[_yield.chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${_yield.chain}`)
      continue
    }

    const yieldStorage: YieldStorage = {
      chain: _yield.chain,
      adapter_id: _yield.adapterId,
      address: _yield.address,
      pool: _yield.pool,
      apy: _yield.apy,
      apy_base: _yield.apyBase ?? null,
      apy_reward: _yield.apyReward ?? null,
      apy_mean_30d: _yield.apyMean30d ?? null,
      il_risk: _yield.ilRisk,
      apy_pct_1d: _yield.apyPct1D ?? null,
      apy_pct_7d: _yield.apyPct7D ?? null,
      apy_pct_30d: _yield.apyPct30D ?? null,
      underlyings: _yield.underlyings ?? [],
      updated_at: toDateTime(_yield.updatedAt),
    }

    yieldsStorage.push(yieldStorage)
  }

  return yieldsStorage
}

export function deleteOldYields(client: ClickHouseClient) {
  return client.command({
    query: `
      WITH latest AS (
        SELECT "timestamp" FROM lf.yields ORDER BY "timestamp" DESC LIMIT 1
      )
      DELETE FROM lf.yields WHERE "timestamp" < latest."timestamp";
    `,
  })
}

export function insertYields(client: ClickHouseClient, yields: Yield[]) {
  const values = toStorage(yields)

  if (values.length === 0) {
    return
  }

  return client.insert({
    table: 'lf.yields',
    values,
    format: 'JSONEachRow',
  })
}

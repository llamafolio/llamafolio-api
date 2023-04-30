import { sliceIntoChunks } from '@lib/array'
import { Chain, chainIdResolver } from '@lib/chains'
import { PoolClient } from 'pg'
import format from 'pg-format'

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

  return yields.data.map(({ project, ...data }) => ({
    ...data,
    chain: (chainIdResolver[data.chain.toLowerCase()] || data.chain.toLowerCase()) as Chain,
    address: extractAddress(data.pool_old),
    adapterId: project,
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
}

export function toStorage(yields: Yield[]) {
  const yieldsStorage: YieldStorage[] = []

  for (const _yield of yields) {
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
    }

    yieldsStorage.push(yieldStorage)
  }

  return yieldsStorage
}

export function fromStorage(yieldsStorage: YieldStorage[]) {
  const yields: Yield[] = []

  for (const yieldStorage of yieldsStorage) {
    const _yield: Yield = {
      chain: (chainIdResolver[yieldStorage.chain] || yieldStorage.chain) as Chain,
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
    }

    yields.push(_yield)
  }

  return yields
}

export function toRow(_yield: YieldStorable) {
  return [
    _yield.chain,
    _yield.adapterId,
    _yield.address,
    _yield.pool,
    _yield.apy,
    _yield.apyBase,
    _yield.apyReward,
    _yield.apyMean30d,
    _yield.ilRisk,
    _yield.apyPct1D,
    _yield.apyPct7D,
    _yield.apyPct30D,
  ]
}

export async function deleteAllYields(client: PoolClient) {
  return client.query('DELETE FROM yields WHERE true;', [])
}

export async function insertYields(client: PoolClient, yields: YieldStorable[]) {
  const yieldsStorable = yields.map(toRow)

  if (yieldsStorable.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(yieldsStorable, 200).map((chunk) =>
      client.query(
        format(
          `INSERT INTO yields (
            chain,
            adapter_id,
            address,
            pool,
            apy,
            apy_base,
            apy_reward,
            apy_mean_30d,
            il_risk,
            apy_pct_1d,
            apy_pct_7d,
            apy_pct_30d
          ) VALUES %L;`,
          chunk,
        ),
        [],
      ),
    ),
  )
}

export async function resetYields() {}

import { sliceIntoChunks } from '@lib/array'
import { bufToStr, strToBuf } from '@lib/buf'
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

export interface YieldStorage {
  id: Buffer
  data: Omit<YieldOld, 'pool_old'>
}

export type YieldStorable = YieldStorage

export function fromStorage(yieldsStorage: YieldStorage[]) {
  const yields: YieldOld[] = []

  for (const yieldStorage of yieldsStorage) {
    const _yield: YieldOld = {
      pool_old: bufToStr(yieldStorage.id),
      ...yieldStorage.data,
    }

    yields.push(_yield)
  }

  return yields
}

export function toRow(yieldStable: YieldStorable) {
  return [yieldStable.id, yieldStable.data]
}

export function toStorage(yields: YieldOld[]) {
  const yieldsStorable: YieldStorable[] = []

  for (const _yield of yields) {
    const { pool_old, ...data } = _yield

    const yieldStorable: YieldStorable = {
      id: strToBuf(pool_old),
      data,
    }

    yieldsStorable.push(yieldStorable)
  }

  return yieldsStorable
}

export async function selectYieldsByIds(client: PoolClient, ids: string[]) {
  const yieldsRes = await client.query(format(`select * from yields where id in (%L);`, ids.map(strToBuf)), [])

  return fromStorage(yieldsRes.rows)
}

export function deleteAllYields(client: PoolClient) {
  return client.query('DELETE FROM yields WHERE true;', [])
}

export function insertYields(client: PoolClient, yields: YieldOld[]) {
  const values = toStorage(yields).map(toRow)

  if (values.length === 0) {
    return
  }

  return Promise.all(
    sliceIntoChunks(values, 1_000).map((chunk) =>
      client.query(format('INSERT INTO yields (id, data) VALUES %L ON CONFLICT DO NOTHING;', chunk), []),
    ),
  )
}

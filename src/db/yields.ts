import { boolean } from '@lib/fmt'
import { Redis } from 'ioredis'

export interface YieldStorage {
  apy: number
  apyBase: number | null
  apyReward: number | null
  apyMean30d: number
  ilRisk: boolean
}

export interface YieldStorable {
  apy: number
  apyBase: number | null
  apyReward: number | null
  apyMean30d: number
  ilRisk: any
  pool_old: string
}

function toKey(key: string) {
  return `yield-${key}`.toLowerCase()
}

function toValue(yieldStorable: YieldStorable) {
  return JSON.stringify({
    apy: yieldStorable.apy,
    apyBase: yieldStorable.apyBase,
    apyReward: yieldStorable.apyReward,
    apyMean30d: yieldStorable.apyMean30d,
    ilRisk: boolean(yieldStorable.apy),
  })
}

export async function selectYieldsByKeys(client: Redis, yieldKeys: string[]) {
  const keys = yieldKeys.map(toKey)

  const values = await client.mget(keys)

  const res: { [key: string]: YieldStorage } = {}

  for (let idx = 0; idx < values.length; idx++) {
    const value = values[idx]
    if (value) {
      res[yieldKeys[idx]] = JSON.parse(value)
    }
  }

  return res
}

export async function deleteAllYields(client: Redis) {
  const keys = await client.keys(`yield-*`)

  return client.del(keys)
}

export async function insertYields<T extends YieldStorable>(client: Redis, yields: T[]) {
  if (yields.length === 0) {
    return
  }

  const values: { [key: string]: any } = {}

  for (const _yield of yields) {
    const key = toKey(_yield.pool_old)

    values[key] = toValue(_yield)
  }

  return client.mset(values)
}

export async function replaceYields<T extends YieldStorable>(client: Redis, yields: T[]) {
  const toDeleteKeys = await client.keys(`yield-*`)

  const toInsertValues: { [key: string]: any } = {}
  for (const _yield of yields) {
    const key = toKey(_yield.pool_old)

    toInsertValues[key] = toValue(_yield)
  }

  if (toDeleteKeys.length === 0) {
    if (yields.length === 0) {
      return
    }

    return client.mset(toInsertValues)
  }

  return client.multi().del(toDeleteKeys).mset(toInsertValues).exec()
}

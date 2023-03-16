import { MultiCallResult } from '@lib/multicall'
import { isNotNullish, isSuccess } from '@lib/type'

export function range(start: number, end: number, step = 1) {
  const nums: number[] = []

  for (let i = start; i < end; i += step) {
    nums.push(i)
  }
  return nums
}

export function sliceIntoChunks<T>(arr: T[], chunkSize: number) {
  const res = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    res.push(chunk)
  }
  return res
}

export interface KeyByOptions {
  lowercase?: boolean
}

export function keyBy<T extends Record<string, any>>(arr: T[], key: keyof T, options?: KeyByOptions) {
  const keys: { [key: string]: T } = {}

  for (const item of arr) {
    let itemKey = item[key]

    if (options?.lowercase) {
      itemKey = itemKey.toLowerCase()
    }

    keys[itemKey] = item
  }

  return keys
}

export function keyBy2<T extends Record<string, any>>(arr: T[], key0: keyof T, key1: keyof T, options?: KeyByOptions) {
  const keys: { [key0: string]: { [key1: string]: T } } = {}

  for (const item of arr) {
    let itemKey0 = item[key0]
    let itemKey1 = item[key1]

    if (options?.lowercase) {
      itemKey0 = itemKey0.toLowerCase()
      itemKey1 = itemKey1.toLowerCase()
    }

    if (!keys[itemKey0]) {
      keys[itemKey0] = {}
    }

    keys[itemKey0][itemKey1] = item
  }

  return keys
}

export interface GroupByOptions {
  lowercase?: boolean
}

export function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T, options?: GroupByOptions) {
  const groups: { [key: string]: T[] } = {}

  for (const item of arr) {
    let itemKey = item[key]

    if (options?.lowercase) {
      itemKey = itemKey.toLowerCase()
    }

    if (!groups[itemKey]) {
      groups[itemKey] = []
    }
    groups[itemKey].push(item)
  }

  return groups
}

export function groupBy2<T extends Record<string, any>>(
  arr: T[],
  key0: keyof T,
  key1: keyof T,
  options?: GroupByOptions,
) {
  const groups: { [key0: string]: { [key1: string]: T[] } } = {}

  for (const item of arr) {
    let itemKey0 = item[key0]
    let itemKey1 = item[key1]

    if (options?.lowercase) {
      itemKey0 = itemKey0.toLowerCase()
      itemKey1 = itemKey1.toLowerCase()
    }

    if (!groups[itemKey0]) {
      groups[itemKey0] = {}
    }
    if (!groups[itemKey0][itemKey1]) {
      groups[itemKey0][itemKey1] = []
    }
    groups[itemKey0][itemKey1].push(item)
  }

  return groups
}

/**
 * Map successful Multicall results array and include errors in return
 * @param results
 * @param mapFn
 */
export function mapSuccess<T>(results: MultiCallResult[], mapFn: (res: MultiCallResult, index: number) => T | null) {
  return results.map((res, index) => (isSuccess(res) ? mapFn(res, index) : null))
}

/**
 * FlatMap successful Multicall results array and include errors in return
 * @param results
 * @param mapFn
 */
export function flatMapSuccess<T>(
  results: MultiCallResult[],
  mapFn: (res: MultiCallResult, index: number) => T[] | null,
) {
  return results.flatMap((res, index) => (isSuccess(res) ? mapFn(res, index) : []))
}

/**
 * Map successful Multicall results array and filter errors in return
 * @param results
 * @param mapFn
 */
export function mapSuccessFilter<T>(
  results: MultiCallResult[],
  mapFn: (res: MultiCallResult, index: number) => T | null,
) {
  return mapSuccess(results, mapFn).filter(isNotNullish)
}

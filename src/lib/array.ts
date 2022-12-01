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

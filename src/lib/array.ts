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

export function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T) {
  const groups: { [key: string]: T[] } = {}

  for (const item of arr) {
    if (!groups[item[key]]) {
      groups[item[key]] = []
    }
    groups[item[key]].push(item)
  }

  return groups
}

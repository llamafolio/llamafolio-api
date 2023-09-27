import { formatUnits, parseUnits } from 'viem'

export const MAX_UINT_256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

export function sumBI(nums: bigint[]) {
  let res = 0n
  for (const num of nums) {
    res += num
  }
  return res
}

export function sum(nums: number[]) {
  let res = 0
  for (const num of nums) {
    res += num || 0
  }
  return res
}

export function avg(nums: number[], len: number) {
  return sum(nums) / len
}

export function mulPrice(amount: bigint, decimals: number, price: number) {
  try {
    const priceBI = parseUnits(price.toFixed(decimals || 0) as `${number}`, decimals)

    return parseFloat(formatUnits(amount * priceBI, 2 * decimals))
  } catch (err) {
    console.error(`Failed to mulPrice ${amount}, ${decimals}, ${price}`, err)
    return 0
  }
}

export function parseFloatBI(num: bigint, decimals: number) {
  return parseFloat(formatUnits(num, decimals))
}

import { BigNumber } from 'ethers'
import { parseUnits } from 'viem'

export const BN_ZERO = BigNumber.from('0')
export const BN_TEN = BigNumber.from('10')

export const BigInt_ZERO = BigInt(0)
export const BigInt_TEN = BigInt(10)

// export function isZero<T extends BigNumber | string | number>(num: T) {
//   return num.toString() === '0'
// }

export function isZero<T extends bigint | string | number>(num: T) {
  return num.toString() === '0'
}

// export function decimalsBN(num: BigNumber, decimals: number) {
//   return num.div(BN_TEN.pow(decimals))
// }

export function decimalsBN(num: bigint, decimals: number) {
  return Number(num) / Number(BigInt_TEN ** BigInt(decimals))
}

export function sumBN(nums: BigNumber[]) {
  let res = BigNumber.from('0')
  for (const num of nums) {
    res = res.add(num)
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

export function mulPrice(amountBigInt: bigint | number, decimals: number, price: number) {
  try {
    const priceBigInt = parseUnits(`${Number(price.toFixed(decimals))}`, decimals)

    const mulBigInt = Number(amountBigInt) * Number(priceBigInt)

    return mulBigInt / 10 ** (2 * decimals)
  } catch (err) {
    console.error(`Failed to mulPrice ${amountBigInt.toString()}, ${decimals}, ${price}`, err)
    return 0
  }
}

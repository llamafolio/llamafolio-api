import { BigNumber } from "ethers";

export const BN_ZERO = BigNumber.from("0");
export const BN_TEN = BigNumber.from("10");

export function decimalsBN(num: BigNumber, decimals: number) {
  return num.div(BN_TEN.pow(decimals));
}

export function sumBN(nums: BigNumber[]) {
  let res = BigNumber.from("0");
  for (const num of nums) {
    res = res.add(num);
  }
  return res;
}

export function sum(nums: number[]) {
  let res = 0;
  for (const num of nums) {
    res += num || 0;
  }
  return res;
}

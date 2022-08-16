import { BigNumber } from "ethers";

export const BN_ZERO = BigNumber.from("0");

export function sumBN(nums: BigNumber[]) {
  let res = BigNumber.from("0");
  for (const num of nums) {
    res = res.add(num);
  }
  return res;
}

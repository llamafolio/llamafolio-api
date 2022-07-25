import type { BigNumber } from "@ethersproject/bignumber";
import { parseFixed } from "@ethersproject/bignumber";

export function toBN(x: string, decimals: number): BigNumber {
  if (x === undefined || typeof x !== "string") {
    throw new Error("Input must be a string");
  }

  if (x.includes(".")) {
    const parts: string[] = x.split(".");
    parts[1] = parts[1].slice(0, decimals);
    x = parts[0] + "." + parts[1];
  }

  // Check if x is a whole number or a fixed-point number with some maximum number of decimals.
  const digits: number = 78 - decimals;
  const regexp: RegExp = new RegExp(
    `^[-+]?(\\d{1,${digits}}|(?=\\d+\\.\\d+)\\d{1,${digits}}\\.\\d{1,${decimals}})$`
  );

  if (regexp.test(x)) {
    return parseFixed(x, decimals);
  } else {
    throw new Error("Unknown format for fixed-point number: " + x);
  }
}

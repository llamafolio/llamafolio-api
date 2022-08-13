import { Balance } from "@lib/adapter";

export function toJSON(balance: Balance) {
  return {
    ...balance,
    amount: balance.amount != null ? balance.amount.toString() : balance,
  };
}

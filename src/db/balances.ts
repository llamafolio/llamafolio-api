import { bufToStr } from "@lib/buf";

export type BalanceStorage = {
  chain: string;
  address: Buffer;
  symbol: string;
  decimals: number;
  amount: string;
  category: string;
  adapter_id: string;
  price: string;
  price_timestamp: string;
  balance_usd: string;
  timestamp: string;
  reward: boolean;
  debt: boolean;
  stable: boolean;
  parent: Buffer;
  claimable: string;
  claimable_usd: string;
  type: string;
};

export function fromStorage(rows: BalanceStorage[]) {
  const data = rows.map((row) => ({
    chain: row.chain,
    address: bufToStr(row.address),
    symbol: row.symbol,
    decimals: row.decimals,
    amount: row.amount,
    category: row.category,
    adapterId: row.adapter_id,
    price: parseFloat(row.price),
    priceTimestamp: row.price_timestamp,
    balanceUSD: row.balance_usd ? parseFloat(row.balance_usd) : undefined,
    timestamp: row.timestamp,
    reward: row.reward,
    debt: row.debt,
    stable: row.stable,
    parent: row.parent ? bufToStr(row.parent) : undefined,
    claimable: row.claimable,
    claimableUSD: row.claimable_usd ? parseFloat(row.claimable_usd) : undefined,
    type: row.type,
  }));

  return data;
}

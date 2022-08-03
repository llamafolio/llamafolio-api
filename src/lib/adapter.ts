import { BigNumber } from "ethers";
import { adapters } from "../adapters";
import { Token } from "./token";

// TODO: enum
export type Chain = string;
// TODO: 0x...
export type Hex = string;

export type ChainAddress = `${Chain}:${Hex}`;

export type BaseContext = {
  address: string;
};

export type BalanceContext = BaseContext & {
  chain: string;
  contract: string;
};

export type Category =
  | "wallet"
  | "lend"
  | "borrow"
  | "farm"
  | "stake"
  | "lock"
  | "vest";

export type BaseBalance = Token & {
  amount: BigNumber;
};

export type Balance = BaseBalance & {
  category: Category;
  // TODO: below fields depend on category
  // ex: "unlockable", "expiry" for "lock" etc
  underlying?: BaseBalance[];
  rewards?: BaseBalance[];

  children?: Balance[];
};

export type PricedBalance = Balance & {
  price: number;
  balanceUSD: number;
  timestamp: number;
};

export type BalancesConfig = {
  balances: Balance[];
  revalidate?: number;
};

export type Contract = {
  name: string;
  chain: string;
  address: string;
};

export type ContractsConfig = {
  contracts: Contract[];
  revalidate?: number;
};

export type Links = {
  website?: string;
  doc?: string;
  github?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  medium?: string;
};

export interface Adapter {
  name: string;
  description: string;
  // CoinGecko ID
  coingecko?: string;
  // DefiLlama ID
  defillama: string;
  links: Links;
  getContracts: () => ContractsConfig | Promise<ContractsConfig>;
  getBalances: (
    ctx: BalanceContext
  ) => BalancesConfig | Promise<BalancesConfig>;
}

// TODO: get adapters from a real storage cache + add logic to revalidate
// so we never have to run the getContracts promise during an API call
export async function getAdapters(addresses: ChainAddress[]) {
  const fake_cache: { [key: string]: Adapter } = {};

  const adaptersContracts = await Promise.all(
    adapters.map((adapter) => adapter.getContracts())
  );

  for (let i = 0; i < adaptersContracts.length; i++) {
    for (const contract of adaptersContracts[i].contracts) {
      const key = `${contract.chain}:${contract.address}`;
      fake_cache[key] = adapters[i];
    }
  }

  return addresses.flatMap((address) => fake_cache[address] || []);
}

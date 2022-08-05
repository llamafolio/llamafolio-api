import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers";
import { adapters } from "@adapters/index";
import { Token } from "@lib/token";

export type BaseContext = {
  address: string;
};

export type Category =
  | "wallet"
  | "lend"
  | "lend-rewards"
  | "borrow"
  | "borrow-stable"
  | "borrow-variable"
  | "farm"
  | "lp"
  | "lp-stable"
  | "stake"
  | "lock"
  | "lock-rewards"
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
  rewardRates?: any;

  children?: Balance[];
};

export type PricedBalance = Balance & {
  price: number;
  balanceUSD: number;
  // price updated at
  timestamp: number;
};

export type BalancesConfig = {
  balances: Balance[];
  revalidate?: number;
};

export type BaseContract = {
  chain: Chain;
  address: string;
};

export type Contract = BaseContract & {
  name?: string;
  displayName?: string;
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
    ctx: BaseContext,
    contracts: BaseContract[]
  ) => BalancesConfig | Promise<BalancesConfig>;
}

// TODO: get adapters from a real storage cache + add logic to revalidate
// so we never have to run the getContracts promise during an API call
export async function getAdapters(contracts: BaseContract[]) {
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

  return contracts.flatMap(
    (contract) => fake_cache[`${contract.chain}:${contract.address}`] || []
  );
}

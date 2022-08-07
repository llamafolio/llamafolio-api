import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers";
import { Token } from "@lib/token";
import { isNotNullish } from "@lib/type";

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
  id: string;
  name: string;
  description: string;
  // CoinGecko ID
  coingecko?: string;
  // DefiLlama ID
  defillama?: string;
  links: Links;
  getContracts: () => ContractsConfig | Promise<ContractsConfig>;
  getBalances: (
    ctx: BaseContext,
    contracts: BaseContract[]
  ) => BalancesConfig | Promise<BalancesConfig>;
}

export async function resolveContractsBalances(
  resolver: (contract: Contract) => Promise<Balance[]> | undefined | null,
  contracts: Contract[]
) {
  const balances = await Promise.all(
    contracts.map(resolver).filter(isNotNullish)
  );

  return balances.flat();
}

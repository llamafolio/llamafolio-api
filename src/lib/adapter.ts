import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers";
import { Token } from "@lib/token";
import { isNotNullish } from "@lib/type";
import { Category } from "@lib/category";

export type BaseContext = {
  address: string;
};

export type BaseBalance = Token & {
  amount: BigNumber;
};

export type RewardBalance = BaseBalance & {
  rates?: any;
};

export type Balance = BaseBalance & {
  category: Category;
  children?: Balance[];
  rewards?: BaseBalance[];
  stable?: boolean;
  rates?: any;
};

export type PricedBalance = Balance & {
  price: number;
  balanceUSD: number;
  // price updated at
  timestamp: number;
};

export type CategoryBalances = {
  title: string;
  totalUSD: number;
  balances: Balance[];
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
  // Unique adapter identifier. Use DeFiLlama slug if applicable
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

export interface AdapterResolver {
  getContracts: () => Contract[] | Promise<Contract[]>;
  getBalances: (
    ctx: BaseContext,
    contracts: BaseContract[]
  ) => Balance[] | Promise<Balance[]>;
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

export function mergeAdaptersResolvers(adapterResolvers: AdapterResolver[]) {
  return {
    async getContracts() {
      const balances = await Promise.all(
        adapterResolvers.map((resolver) => resolver.getContracts())
      );

      return balances.flat();
    },
    async getBalances(ctx: BaseContext, contracts: BaseContract[]) {
      const balances = await Promise.all(
        adapterResolvers.map((resolver) => resolver.getBalances(ctx, contracts))
      );

      return balances.flat();
    },
  };
}

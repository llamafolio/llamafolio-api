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
  // claimable amount. Can be lower than balance amount but not higher.
  // ex: vested reward of 1000 but only 100 currently claimable.
  claimable: BigNumber;
};

export type Balance = (BaseBalance | RewardBalance) & {
  category: Category;
  reward?: boolean;
  debt?: boolean;
  stable?: boolean;
  rates?: any;
  // optional rewards
  rewards?: RewardBalance[];
  // optional underlying tokens.
  // ex: aToken -> token (AAVE)
  // ex: Uniswap Pair -> [token0, token1]
  underlyings?: BaseBalance[];
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

export interface BaseContract {
  chain: Chain;
  address: string;
}

export interface Contract extends BaseContract {
  name?: string;
  displayName?: string;
  [key: string | number]: unknown;
}

export type ContractsConfig = {
  contracts: Contract[];
  revalidate?: number;
};

export interface Adapter {
  /**
   * DefiLlama slug.
   * @see https://docs.llama.fi/list-your-project/submit-a-project to submit your adapter on DefiLlama.
   */
  id: string;
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

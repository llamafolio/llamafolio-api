import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers";
import { Category } from "@lib/category";

export type ContractType = "reward" | "debt" | "underlying";
export type ContractStandard = "erc20" | "erc721";

export interface BaseContext {
  address: string;
}

export interface BaseBalance extends BaseContract {
  amount: BigNumber;
}

export interface BasePricedBalance extends BaseBalance {
  price: number;
  balanceUSD: number;
  // price updated at
  timestamp: number;
}

export interface RewardBalance extends BaseBalance {
  // claimable amount. Can be lower than balance amount but not higher.
  // ex: vested reward of 1000 but only 100 currently claimable.
  claimable: BigNumber;
  // TODO: rewards interface
  rates?: any;
}

export interface Balance extends BaseBalance {
  // optional rewards
  rewards?: BaseBalance[];
  // optional underlying tokens.
  // ex: aToken -> token (AAVE)
  // ex: Uniswap Pair -> [token0, token1]
  underlyings?: BaseBalance[];
}

export interface PricedBalance extends BasePricedBalance {
  rewards?: BasePricedBalance[];
  underlyings?: BasePricedBalance[];
}

export interface BalancesConfig {
  balances: Balance[];
  revalidate?: number;
}

export interface BaseContract {
  // discriminators
  type?: ContractType;
  standard?: ContractStandard;
  category?: Category;

  name?: string;
  displayName?: string;
  chain: Chain;
  address: string;
  symbol?: string;
  decimals?: number;
  stable?: boolean;
}

export interface Contract extends BaseContract {
  rewards?: BaseContract[];
  underlyings?: BaseContract[];
  [key: string | number]: any;
}

export interface ContractsConfig {
  contracts: Contract[] | { [key: string]: Contract | Contract[] };
  revalidate?: number;
}

export type GetContractsHandler = () =>
  | ContractsConfig
  | Promise<ContractsConfig>;

export type GetBalancesHandler<C extends GetContractsHandler> = (
  ctx: BaseContext,
  contracts: Awaited<ReturnType<C>>["contracts"]
) => BalancesConfig | Promise<BalancesConfig>;

export interface Adapter {
  /**
   * DefiLlama slug.
   * @see https://docs.llama.fi/list-your-project/submit-a-project to submit your adapter on DefiLlama.
   */
  id: string;
  getContracts: GetContractsHandler;
  getBalances: GetBalancesHandler<GetContractsHandler>;
}

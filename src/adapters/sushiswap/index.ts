import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOfWithUnderlying } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";
import { getBalances } from "./balances";

const masterChef: Contract = {
  name: "masterChef",
  displayName: "MasterChef",
  chain: "ethereum",
  address: "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd",
};

const adapter: Adapter = {
  id: "sushiswap",
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
        // length: 50,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getERC20BalanceOfWithUnderlying(
      ctx,
      "ethereum",
      contracts
    );
    // const stakeBalances = await getBalances(ctx, "ethereum", [masterChef]);
    // balances = balances.concat(stakeBalances);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: !balance.category ? "lp" : balance.category,
      })),
    };
  },
};

export default adapter;

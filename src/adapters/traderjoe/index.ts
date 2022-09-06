import { Adapter } from "@lib/adapter";
import { getERC20BalanceOfWithUnderlying } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "trader-joe",
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "avax",
        factoryAddress: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
        length: 100,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOfWithUnderlying(ctx, "avax", contracts);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "lp",
      })),
    };
  },
};

export default adapter;

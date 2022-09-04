import { Adapter } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "pancakeswap",
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "bsc",
        factoryAddress: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
        length: 100,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOf(ctx, "bsc", contracts);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "farm",
      })),
    };
  },
};

export default adapter;

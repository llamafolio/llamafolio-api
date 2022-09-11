import { Adapter } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";
import { Token } from "@lib/token";

const adapter: Adapter = {
  id: "pangolin",
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "avax",
        factoryAddress: "0xefa94de7a4656d787667c749f7e1223d71e9fd88",
        length: 100,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOf(ctx, "avax", contracts as Token[]);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "farm",
      })),
    };
  },
};

export default adapter;

import { Adapter } from "@lib/adapter";
import { getERC20BalanceOfWithUnderlying } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "sushiswap",
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
        length: 3109,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOfWithUnderlying(ctx, "ethereum", contracts);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "lp",
      })),
    };
  },
};

export default adapter;

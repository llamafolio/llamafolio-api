import { Adapter } from "@lib/adapter";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";

const adapter: Adapter = {
  id: "pancakeswap",
  async getContracts() {
    const pairs = await getPairsContracts({
      chain: "bsc",
      factoryAddress: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
      length: 100,
    });

    return {
      contracts: pairs,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const pairs = await getPairsBalances(ctx, "bsc", contracts);

    return {
      balances: pairs,
    };
  },
};

export default adapter;

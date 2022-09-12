import { Adapter } from "@lib/adapter";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";

const adapter: Adapter = {
  id: "spookyswap",
  async getContracts() {
    const pairs = await getPairsContracts({
      chain: "fantom",
      factoryAddress: "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3",
      length: 100,
    });

    return {
      contracts: pairs,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const pairs = await getPairsBalances(ctx, "fantom", contracts);

    return {
      balances: pairs,
    };
  },
};

export default adapter;

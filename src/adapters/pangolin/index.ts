import { Adapter } from "@lib/adapter";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";

const adapter: Adapter = {
  id: "pangolin",
  async getContracts() {
    const pairs = await getPairsContracts({
      chain: "avax",
      factoryAddress: "0xefa94de7a4656d787667c749f7e1223d71e9fd88",
      length: 100,
    });

    return {
      contracts: pairs,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const pairs = await getPairsBalances(ctx, "avax", contracts);

    return {
      balances: pairs,
    };
  },
};

export default adapter;

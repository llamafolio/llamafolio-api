import { Adapter } from "@lib/adapter";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";

const adapter: Adapter = {
  id: "trader-joe",
  async getContracts() {
    const pairs = await getPairsContracts({
      chain: "avax",
      factoryAddress: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
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

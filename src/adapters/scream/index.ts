import { Adapter } from "@lib/adapter";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";

const adapter: Adapter = {
  id: "scream",
  async getContracts() {
    const poolsMarkets = await getMarketsContracts("fantom", {
      // Scream Unitroller
      comptrollerAddress: "0x260e596dabe3afc463e75b6cc05d8c46acacfb09",
    });

    return {
      contracts: poolsMarkets,
    };
  },

  async getBalances(ctx, contracts) {
    const balances = await getMarketsBalances(ctx, "fantom", contracts);

    return {
      balances,
    };
  },
};

export default adapter;

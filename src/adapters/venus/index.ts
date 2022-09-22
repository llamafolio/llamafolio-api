import { Adapter } from "@lib/adapter";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";

const adapter: Adapter = {
  id: "venus",
  async getContracts() {
    const markets = await getMarketsContracts("bsc", {
      // Venus Unitroller
      comptrollerAddress: "0xfd36e2c2a6789db23113685031d7f16329158384",
    });

    return {
      contracts: markets,
    };
  },
  async getBalances(ctx, contracts) {
    const markets = await getMarketsBalances(ctx, "bsc", contracts);

    return {
      balances: markets,
    };
  },
};

export default adapter;

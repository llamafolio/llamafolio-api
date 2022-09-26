import { Adapter } from "@lib/adapter";
import { getPoolsContracts, getPoolsSupplies } from "./pools";
import { getFarmBalances } from "./farm";
import { getStakeBalances } from "./stake";

const adapter: Adapter = {
  id: "truefi",
  async getContracts() {
    return {
      contracts: await getPoolsContracts("ethereum"),
    };
  },
  async getBalances(ctx, contracts) {
    const poolsSupplies = await getPoolsSupplies("ethereum", contracts);

    const [farmBalances, stakeBalances] = await Promise.all([
      getFarmBalances(ctx, "ethereum", poolsSupplies),
      getStakeBalances(ctx, "ethereum", poolsSupplies),
    ]);

    return {
      balances: [...farmBalances, ...stakeBalances],
    };
  },
};

export default adapter;

import { Adapter, Balance, Contract } from "@lib/adapter";
import { getAllPools, getPoolBalances } from "./pools";

const adapter: Adapter = {
  id: "convex-finance",
  async getContracts() {
    return {
      contracts: (await getAllPools()) as Contract[],
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getPoolBalances(ctx, "ethereum", contracts);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category:
          (balance as Balance).category !== undefined
            ? (balance as Balance).category
            : "lp",
      })),
    };
  },
};

export default adapter;

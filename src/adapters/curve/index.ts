import { Adapter, Balance, Contract } from "@lib/adapter";
import { getAllPools } from "./pools";
import { getGaugeBalances } from "./gauges";
import { getLockedBalances } from "./locker";
import { getERC20Balances } from "@lib/erc20";

const adapter: Adapter = {
  id: "curve",
  async getContracts() {
    return {
      contracts: (await getAllPools()) as Contract[],
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getERC20Balances(
      ctx,
      "ethereum",
      contracts.map((c) => c.address)
    );
    const gaugeBalances = await getGaugeBalances(ctx, "ethereum");
    balances = balances.concat(gaugeBalances);

    const lockedBalances = await getLockedBalances(ctx, "ethereum");
    balances = balances.concat(lockedBalances);

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

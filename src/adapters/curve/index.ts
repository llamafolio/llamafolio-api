import { Adapter, Balance, Contract } from "@lib/adapter";
import { isNotNullish } from "@lib/type";
import { getPoolsBalances, getPoolsContracts } from "./pools";
import { getGaugeBalances, getGaugesContracts } from "./gauges";
import {
  getLockedBalances,
  lockerContract,
  feeDistributorContract,
} from "./locker";

const adapter: Adapter = {
  id: "curve",
  async getContracts() {
    const pools = await getPoolsContracts();
    const gauges = await getGaugesContracts("ethereum", pools);
    const locker = lockerContract;

    return {
      contracts: { pools, gauges, locker },
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, { pools, gauges, locker }) {
    const balances = (
      await Promise.all([
        locker
          ? getLockedBalances(
              ctx,
              "ethereum",
              locker.address,
              feeDistributorContract.address
            )
          : null,
        getPoolsBalances(ctx, "ethereum", pools),
        getGaugeBalances(ctx, "ethereum", gauges),
      ])
    )
      .flat()
      .filter(isNotNullish);

    return {
      balances,
    };
  },
};

export default adapter;

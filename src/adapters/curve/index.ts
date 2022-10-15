import { Adapter, GetBalancesHandler } from "@lib/adapter";
import { isNotNullish } from "@lib/type";
import { getPoolsBalances, getPoolsContracts } from "./pools";
import { getGaugeBalances, getGaugesContracts } from "./gauges";
import {
  getLockedBalances,
  lockerContract,
  feeDistributorContract,
} from "./locker";

const getContracts = async () => {
  const pools = await getPoolsContracts();
  const gauges = await getGaugesContracts("ethereum", pools);
  const locker = lockerContract;

  return {
    contracts: { pools, gauges, locker },
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { pools, gauges, locker }
) => {
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
};

const adapter: Adapter = {
  id: "curve",
  getContracts,
  getBalances,
};

export default adapter;

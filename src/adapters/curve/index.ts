import { Adapter, Balance, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { isNotNullish } from "@lib/type";
import { getAllPools } from "./pools";
import { getGaugeBalances, getGaugesContracts } from "./gauges";
import {
  getLockedBalances,
  lockerContracts,
  getLockerContracts,
} from "./locker";

const adapter: Adapter = {
  id: "curve",
  async getContracts() {
    const [pools, gauges] = await Promise.all([
      getAllPools(),
      getGaugesContracts("ethereum"),
    ]);
    const locker = getLockerContracts();

    return {
      contracts: [...pools, ...locker, ...gauges],
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const promises: Promise<Balance[] | Balance>[] = [];
    const pools: Contract[] = [];
    const gauges: Contract[] = [];

    for (const contract of contracts) {
      if (
        contract.chain === "ethereum" &&
        contract.address === lockerContracts["ethereum"]["locker"].address
      ) {
        promises.push(getLockedBalances(ctx, "ethereum"));
      } else if (contract.type === "pool") {
        pools.push({ ...contract, category: "lp" });
      } else if (contract.type === "gauge") {
        gauges.push(contract);
      }
    }

    promises.push(getERC20BalanceOf(ctx, "ethereum", pools));

    promises.push(getGaugeBalances(ctx, "ethereum", gauges));

    return {
      balances: (await Promise.all(promises)).flat().filter(isNotNullish),
    };
  },
};

export default adapter;

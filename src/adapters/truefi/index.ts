import { Adapter, GetBalancesHandler } from "@lib/adapter";
import { getPoolsContracts, getPoolsSupplies } from "./pools";
import { getFarmBalances } from "./farm";
import { getStakeBalances } from "./stake";

const getContracts = async () => {
  return {
    contracts: await getPoolsContracts("ethereum"),
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const poolsSupplies = await getPoolsSupplies("ethereum", contracts);

  const [farmBalances, stakeBalances] = await Promise.all([
    getFarmBalances(ctx, "ethereum", poolsSupplies),
    getStakeBalances(ctx, "ethereum", poolsSupplies),
  ]);

  return {
    balances: [...farmBalances, ...stakeBalances],
  };
};

const adapter: Adapter = {
  id: "truefi",
  getContracts,
  getBalances,
};

export default adapter;

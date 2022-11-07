import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getLendBalances } from "@adapters/liquity/lend";
import { getFarmBalances } from "@adapters/liquity/farm";

const stabilityPool: Contract = {
  name: "stabPool",
  displayName: "Stability Pool",
  chain: "ethereum",
  address: "0x66017D22b0f8556afDd19FC67041899Eb65a21bb",
};

const troveManager: Contract = {
  name: "trove",
  displayName: "Trove Manager",
  chain: "ethereum",
  address: "0xa39739ef8b0231dbfa0dcda07d7e29faabcf4bb2",
};

const getContracts = () => {
  return {
    contracts: { stabilityPool, troveManager },
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { stabilityPool, troveManager }
) => {
  const [lendBalances, stakeBalances] = await Promise.all([
    getLendBalances(ctx, "ethereum", troveManager),
    getFarmBalances(ctx, "ethereum", stabilityPool),
  ]);

  return {
    balances: lendBalances.concat(stakeBalances),
  };
};

const adapter: Adapter = {
  id: "liquity",
  getContracts,
  getBalances,
};

export default adapter;

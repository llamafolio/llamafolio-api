import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

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
    contracts: [stabilityPool, troveManager],
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getStakeBalances(ctx, "ethereum", contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "liquity",
  getContracts,
  getBalances,
};

export default adapter;

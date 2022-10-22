import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const sSPA: Contract = {
  name: "Staked Spartacus",
  displayName: "Staked Spartacus",
  chain: "fantom",
  address: "0x8e2549225E21B1Da105563D419d5689b80343E01",
  decimals: 9,
  symbol: "sSPA",
};

const getContracts = async () => {
  return {
    contracts: { sSPA },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sSPA }
) => {
  const balances = await getStakeBalances(ctx, "fantom", sSPA);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "spartacus",
  getContracts,
  getBalances,
};

export default adapter;

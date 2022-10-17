import { Adapter, Balance, Contract, GetBalancesHandler } from "@lib/adapter";
import { getContractsFromGraph } from "./contracts";
import { getStakeBalances } from "./balances";

const getContracts = async () => {
  return {
    contracts: await getContractsFromGraph(),
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getStakeBalances(ctx, "ethereum", contracts);

  return {
    balances: balances,
  };
};

const adapter: Adapter = {
  id: "maple",
  getContracts,
  getBalances,
};

export default adapter;

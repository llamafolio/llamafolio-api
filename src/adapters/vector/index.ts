import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getLockerBalances } from "./balances";

const vtxLocker: Contract = {
  name: "vectorLocker",
  displayName: "VTX Locker",
  chain: "avax",
  address: "0x574679Ec54972cf6d705E0a71467Bb5BB362919D",
};

const getContracts = () => {
  return {
    contracts: [vtxLocker],
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getLockerBalances(ctx, "avax", contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "vector-finance",
  getContracts,
  getBalances,
};

export default adapter;

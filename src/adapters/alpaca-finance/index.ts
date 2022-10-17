import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getPoolsContracts, getContractsInfos } from "./pool";
import { getFarmBalances } from "./balances";

const FairLaunch: Contract = {
  name: "fairlaunchContractAddress",
  chain: "bsc",
  address: "0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F",
};

const getContracts = async () => {
  const poolsContracts = await getPoolsContracts("bsc", FairLaunch);
  const contracts = await getContractsInfos("bsc", poolsContracts);
  return {
    contracts,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  // const balances = await getFarmBalances(ctx, "bsc", contracts || []);

  return {
    // balances,
  };
};

const adapter: Adapter = {
  id: "alpaca-finance",
  getContracts,
  getBalances,
};

export default adapter;

import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const sNMS: Contract = {
  name: "Staked Nemesis",
  displayName: "Staked Nemesis",
  chain: "bsc",
  address: "0xb91bfdb8b41120586ccb391f5cee0dae4482334f",
  decimals: 9,
  symbol: "sNMS ",
};

const getContracts = async () => {
  return {
    contracts: { sNMS },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sNMS }
) => {
  const balances = await getStakeBalances(ctx, "bsc", sNMS);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "olympus-dao",
  getContracts,
  getBalances,
};

export default adapter;

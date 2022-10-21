import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getFarmingBalances, getStakeBalances } from "./balances";

const wsHEC: Contract = {
  name: "Wrapped sHEC",
  displayName: "Wrapped sHEC",
  chain: "fantom",
  address: "0x94CcF60f700146BeA8eF7832820800E2dFa92EdA",
  decimals: 18,
  symbol: "wsHEC",
};

const StakingGateway: Contract = {
  name: "StakingGateway",
  address: "0x86fb74B3b1949985AC2081B9c679d84BB44A2bf2",
  chain: "fantom",
};

const getContracts = async () => {
  return {
    contracts: { wsHEC, StakingGateway },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { wsHEC, StakingGateway }
) => {
  const [stakeBalances, farmingBalances] = await Promise.all([
    getStakeBalances(ctx, "fantom", wsHEC || []),
    getFarmingBalances(ctx, "fantom", StakingGateway || []),
  ]);

  const balances = [...stakeBalances, ...farmingBalances];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "hector-network",
  getContracts,
  getBalances,
};

export default adapter;

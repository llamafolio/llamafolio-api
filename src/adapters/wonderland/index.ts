import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getFormattedStakeBalances, getFarmBalances } from "./balances";

const wMEMO: Contract = {
  name: "Wrapped MEMO",
  displayName: "Wrapped MEMO",
  chain: "avax",
  address: "0x0da67235dd5787d67955420c84ca1cecd4e5bb3b",
  decimals: 18,
  symbol: "wMEMO ",
};

const wMemoFarm: Contract = {
  name: "Multirewards",
  chain: "avax",
  address: "0xC172c84587bEa6d593269bFE08632bf2Da2Bc0f6",
  token: wMEMO,
};

const getContracts = async () => {
  return {
    contracts: { wMEMO, wMemoFarm },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { wMEMO, wMemoFarm }
) => {
  const [formattedStakeBalances, farmBalances] = await Promise.all([
    getFormattedStakeBalances(ctx, "avax", wMEMO),
    getFarmBalances(ctx, "avax", wMemoFarm),
  ]);

  const balances = [...formattedStakeBalances, ...farmBalances];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "wonderland",
  getContracts,
  getBalances,
};

export default adapter;

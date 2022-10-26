import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances, getFormattedStakeBalances } from "./balances";

const FLOOR: Contract = {
  name: "Floor",
  chain: "ethereum",
  address: "0xf59257E961883636290411c11ec5Ae622d19455e",
  decimals: 9,
  symbol: "FLOOR ",
};

const sFLOOR: Contract = {
  name: "staked FLOOR",
  chain: "ethereum",
  address: "0x164afe96912099543bc2c48bb9358a095db8e784",
  decimals: 18,
  symbol: "sFLOOR",
  underlyings: [FLOOR],
};

const gFLOOR: Contract = {
  name: "Governance FLOOR",
  chain: "ethereum",
  address: "0xb1cc59fc717b8d4783d41f952725177298b5619d",
  decimals: 18,
  symbol: "gFLOOR",
  underlyings: [FLOOR],
};

const getContracts = () => {
  return {
    contracts: { sFLOOR, gFLOOR },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sFLOOR, gFLOOR }
) => {
  const [stakeBalances, formattedBalance] = await Promise.all([
    getStakeBalances(ctx, "ethereum", sFLOOR),
    getFormattedStakeBalances(ctx, "ethereum", gFLOOR),
  ]);

  const balances = [...stakeBalances, ...formattedBalance];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "floor-dao",
  getContracts,
  getBalances,
};

export default adapter;

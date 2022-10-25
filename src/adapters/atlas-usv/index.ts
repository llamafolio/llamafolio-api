import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const sUSV_ETH: Contract = {
  name: "Staked Universal Store of Value",
  chain: "ethereum",
  address: "0x0Fef13242390F6bB115Df09D8b5FdC4Bc7D16693",
  symbol: "sUSV",
  decimals: 9,
};

const sUSV_POLYGON: Contract = {
  name: "Staked Universal Store of Value",
  chain: "polygon",
  address: "0x01D119e2F0441eA442e3ab84e0dBbf04bd993556",
  symbol: "sUSV",
  decimals: 9,
};

const sUSV_AVAX: Contract = {
  name: "Staked Universal Store of Value",
  chain: "avax",
  address: "0x4022227eBaDa365AeC96FC89E89316E0696C770D",
  symbol: "sUSV",
  decimals: 9,
};

const sUSV_BSC: Contract = {
  name: "Staked Universal Store of Value",
  chain: "bsc",
  address: "0x238A7349A4815604D33665684E3D41E5E00AA015",
  symbol: "sUSV",
  decimals: 9,
};

const getContracts = async () => {
  return {
    contracts: { sUSV_ETH, sUSV_POLYGON, sUSV_AVAX, sUSV_BSC },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sUSV_ETH, sUSV_POLYGON, sUSV_AVAX, sUSV_BSC }
) => {
  const [stakeBalances_ETH, stakeBalances_POLYGON] = await Promise.all([
    getStakeBalances(ctx, "ethereum", sUSV_ETH || []),
    getStakeBalances(ctx, "polygon", sUSV_POLYGON || []),
    getStakeBalances(ctx, "avax", sUSV_AVAX || []),
    getStakeBalances(ctx, "bsc", sUSV_BSC || []),
  ]);

  const balances = [...stakeBalances_ETH, ...stakeBalances_POLYGON];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "atlas-usv",
  getContracts,
  getBalances,
};

export default adapter;

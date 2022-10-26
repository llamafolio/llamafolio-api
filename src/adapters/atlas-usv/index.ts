import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { isNotNullish } from "@lib/type";
import { getStakeBalance } from "./balances";

const sUSV_ETH: Contract = {
  name: "Staked Universal Store of Value",
  chain: "ethereum",
  address: "0x0Fef13242390F6bB115Df09D8b5FdC4Bc7D16693",
  symbol: "sUSV",
  decimals: 9,
  underlyings: [
    {
      name: "Universal Store of Value",
      chain: "ethereum",
      address: "0x88536C9B2C4701b8dB824e6A16829D5B5Eb84440",
      symbol: "USV",
      decimals: 9,
    },
  ],
};

const sUSV_POLYGON: Contract = {
  name: "Staked Universal Store of Value",
  chain: "polygon",
  address: "0x01D119e2F0441eA442e3ab84e0dBbf04bd993556",
  symbol: "sUSV",
  decimals: 9,
  underlyings: [
    {
      name: "Universal Store of Value",
      chain: "polygon",
      address: "0xac63686230f64bdeaf086fe6764085453ab3023f",
      symbol: "USV",
      decimals: 9,
    },
  ],
};

const sUSV_AVAX: Contract = {
  name: "Staked Universal Store of Value",
  chain: "avax",
  address: "0x4022227eBaDa365AeC96FC89E89316E0696C770D",
  symbol: "sUSV",
  decimals: 9,
  underlyings: [
    {
      name: "Universal Store of Value",
      chain: "avax",
      address: "0xb0a8E082E5f8d2a04e74372c1bE47737d85A0E73",
      symbol: "USV",
      decimals: 9,
    },
  ],
};

const sUSV_BSC: Contract = {
  name: "Staked Universal Store of Value",
  chain: "bsc",
  address: "0x238A7349A4815604D33665684E3D41E5E00AA015",
  symbol: "sUSV",
  decimals: 9,
  underlyings: [
    {
      name: "Universal Store of Value",
      chain: "bsc",
      address: "0xaf6162DC717CFC8818eFC8d6f46a41Cf7042fCBA",
      symbol: "USV",
      decimals: 9,
    },
  ],
};

const getContracts = () => {
  return {
    contracts: { sUSV_ETH, sUSV_POLYGON, sUSV_AVAX, sUSV_BSC },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sUSV_ETH, sUSV_POLYGON, sUSV_AVAX, sUSV_BSC }
) => {
  const balances = (
    await Promise.all([
      getStakeBalance(ctx, "ethereum", sUSV_ETH),
      getStakeBalance(ctx, "polygon", sUSV_POLYGON),
      getStakeBalance(ctx, "avax", sUSV_AVAX),
      getStakeBalance(ctx, "bsc", sUSV_BSC),
    ])
  ).filter(isNotNullish);

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

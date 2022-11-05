import { Adapter, Balance, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const WAVAX: Contract = {
  name: "Wrapped AVAX",
  chain: "avax",
  address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  symbol: "WAVAX ",
  decimals: 18,
};

const sAVAX: Contract = {
  name: "Staked AVAX",
  chain: "avax",
  address: "0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be",
  symbol: "sAVAX ",
  decimals: 18,
  coingeckoId: "benqi-liquid-staked-avax",
  category: "stake",
  underlyings: [WAVAX],
};

const getContracts = () => {
  return {
    contracts: { sAVAX },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sAVAX }
) => {
  return {
    balances: await getStakeBalances(ctx, "avax", sAVAX),
  };
};

const adapter: Adapter = {
  id: "benqi-staked-avax",
  getContracts,
  getBalances,
};

export default adapter;

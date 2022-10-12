import { Adapter, Contract } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const sAVAX: Contract = {
  name: "Staked AVAX",
  chain: "avax",
  address: "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE",
  symbol: "sAVAX ",
  decimals: 18,
  coingeckoId: "benqi-liquid-staked-avax",
  category: "stake"
};

const adapter: Adapter = {
  id: "benqi-staked-avax",

  async getContracts() {

    return {
      contracts: sAVAX,
    };
  },
  async getBalances(ctx, contract) {

    const stakebalance = await getStakeBalances(ctx, "avax", contract);

    return {
      balances: [stakebalance]
    };
  },
};

export default adapter;

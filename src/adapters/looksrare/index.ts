import { Adapter, Contract } from "@lib/adapter";
import { getStakedBalances } from "./balances";

const underlyings: Contract = {
  name: "Wrapped Ether",
  chain: "ethereum",
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  decimals: 18,
  symbols: "WETH",
};

const LooksRare: Contract = {
  name: "LooksRare Token",
  chain: "ethereum",
  address: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
  underlying: underlyings,
  decimals: 18,
  symbols: "LOOKS",
};

const adapter: Adapter = {
  id: "looksrare",
  async getContracts() {
    return {
      contracts: [],
    };
  },
  async getBalances(ctx) {
    let balances = await getStakedBalances(ctx, "ethereum", LooksRare);

    return {
      balances,
    };
  },
};

export default adapter;

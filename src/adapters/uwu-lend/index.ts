import { Adapter, Contract } from "@lib/adapter";
import { getBalances } from "./balance";

const UwU: Contract = {
  name: "UwU Lend",
  chain: "ethereum",
  address: "0x55C08ca52497e2f1534B59E2917BF524D4765257",
  decimals: 18,
  symbol: "UwU",
};

const adapter: Adapter = {
  id: "uwu-lend",
  async getContracts() {
    return {
      contracts: [UwU],
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getBalances(ctx, "ethereum");

    return {
      balances,
    };
  },
};

export default adapter;

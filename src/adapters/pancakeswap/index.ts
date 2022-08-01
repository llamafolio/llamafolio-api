import { Adapter } from "../../lib/adapter";

const adapter: Adapter = {
  id: "pancakeswap",
  name: "PancakeSwap",
  description: "",
  links: {
    website: "https://pancakeswap.finance/",
  },
  async getContracts() {
    return {
      contracts: [],
      revalidate: 60 * 60, // 1 hour
    };
  },
  async getBalances(ctx) {
    return {
      balances: [],
    };
  },
};

export default adapter;

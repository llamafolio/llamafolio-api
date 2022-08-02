import { Adapter } from "../../lib/adapter";

const adapter: Adapter = {
  name: "Valas Finance",
  coingecko: "valas-finance",
  defillama: "valas-finance",
  description: "",
  links: {
    website: "https://valasfinance.com/",
    doc: "https://docs.valasfinance.com/",
  },
  async getContracts() {
    return {
      contracts: [],
    };
  },
  async getBalances(ctx) {
    return {
      balances: [],
    };
  },
};

export default adapter;

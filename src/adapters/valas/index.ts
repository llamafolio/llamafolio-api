import { Adapter } from "../../lib/adapter";

const adapter: Adapter = {
  id: "valas-finance",
  name: "Valas Finance",
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

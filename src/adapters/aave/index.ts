import { Adapter } from "../../lib/adapter";

import {
  getLendingPoolBalances,
  lendingPoolContract,
} from "./ethereum/v2/lending";


const adapter: Adapter = {
  name: "Geist",
  description: "",
  coingecko: "geist-finance",
  defillama: "geist-finance",
  links: {
    website: "https://geist.finance/",
    doc: "https://docs.geist.finance/",
  },
  getContracts() {
    return {
      contracts: [lendingPoolContract],
    };
  },
  async getBalances(ctx) {

    if (ctx.contract === lendingPoolContract.address) {
      return {
        balances: await getLendingPoolBalances(ctx),
      };
    }

    return { balances: [] };
  },
};

export default adapter;

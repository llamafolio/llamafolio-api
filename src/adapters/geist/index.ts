import { Adapter } from "../../lib/adapter";
import {
  getMultiFeeDistributionBalances,
  multiFeeDistributionContract,
} from "./stake";

import {
  getLendingPoolBalances,
  lendingPoolContract,
} from "./lending";


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
      contracts: [multiFeeDistributionContract, lendingPoolContract],
    };
  },
  async getBalances(ctx) {
    if (ctx.contract === multiFeeDistributionContract.address) {
      return {
        balances: await getMultiFeeDistributionBalances(ctx),
      };
    }

    if (ctx.contract === lendingPoolContract.address) {
      return {
        balances: await getLendingPoolBalances(ctx),
      };
    }

    return { balances: [] };
  },
};

export default adapter;

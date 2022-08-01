import { Adapter } from "../../lib/adapter";
import {
  getMultiFeeDistributionBalances,
  multiFeeDistributionContract,
} from "./stake";

const adapter: Adapter = {
  id: "geist-finance",
  name: "Geist",
  description: "",
  links: {
    website: "https://geist.finance/",
    doc: "https://docs.geist.finance/",
  },
  getContracts() {
    return {
      contracts: [multiFeeDistributionContract],
    };
  },
  async getBalances(ctx) {
    if (ctx.contract === multiFeeDistributionContract.address) {
      return {
        balances: await getMultiFeeDistributionBalances(ctx),
      };
    }

    return { balances: [] };
  },
};

export default adapter;

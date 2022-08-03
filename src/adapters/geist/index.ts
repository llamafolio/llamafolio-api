import { Adapter, Contract } from "../../lib/adapter";
import { getLendingPoolBalances } from "../../lib/aave/v2/lending";
import {
  getMultiFeeDistributionBalances,
  multiFeeDistributionContract,
} from "./stake";

export const lendingPoolContract: Contract = {
  name: "LendingPool",
  dName: "Geist Lending",
  chain: "fantom",
  address: "0x9FAD24f572045c7869117160A571B2e50b10d068",
};

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
        balances: await getLendingPoolBalances(ctx, {
          lendingPoolAddress: lendingPoolContract.address,
        }),
      };
    }

    return { balances: [] };
  },
};

export default adapter;

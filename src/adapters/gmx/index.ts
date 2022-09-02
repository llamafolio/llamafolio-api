import { Adapter, Balance, Contract } from "@lib/adapter";
import { getBalances } from "./balances"
import GMXStakerAbi from "./abis/GMXStaker.json";

const glpStaker: Contract = {
  name: "sGLP",
  displayName: "GLP Staker",
  chain: "arbitrum",
  address: "0x1addd80e6039594ee970e5872d247bf0414c8903",
};


const gmxStaker: Contract = {
  name: "sGMX",
  displayName: "GMX Staker",
  chain: "arbitrum",
  address: "0x908c4d94d34924765f1edc22a1dd098397c59dd4",
}

const adapter: Adapter = {
  id: "gmx",
  name: "GMX",
  coingecko: "gmx",
  defillama: "gmx",
  links: {
    website: "https://gmx.io/",
  },
  async getContracts() {
    return {
      contracts: [glpStaker, gmxStaker],
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {


    const balances = await getBalances(ctx, "arbitrum", contracts);

    return {
      balances,
    };
  },
};

export default adapter;

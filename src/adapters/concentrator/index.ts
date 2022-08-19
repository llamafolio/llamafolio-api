import { Adapter, Contract, resolveContractsBalances } from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";
import { getMultiFeeDistributionBalances } from "@lib/geist/stake";
import { getIFOBalances } from "./ifo";

const concentratorIFOContract: Contract = {
  name: "ConcentratorIFO",
  displayName: "Concentrator IFO",
  chain: "ethereum",
  address: "0x3cf54f3a1969be9916dad548f3c084331c4450b5",
};


const adapter: Adapter = {
  id: "concentrator",
  name: "Concentrator",
  coingecko: "concentrator",
  defillama: "concentrator",
  description: "",
  links: {
    website: "https://concentrator.aladdin.club/",
    doc: "https://github.com/AladdinDAO",
  },
  getContracts() {
    return {
      contracts: [concentratorIFOContract],
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getIFOBalances(
      ctx,
      "ethereum",
      contracts.map((c) => c.address)
    );

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "lp",
      })),
    };
  },
};

export default adapter;

import { Adapter, Contract, resolveContractsBalances } from "@lib/adapter";
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
    function resolver(contract: Contract) {
      if (contract.address === concentratorIFOContract.address) {
        return getIFOBalances(ctx, "ethereum");
      }
    }

    return { balances: await resolveContractsBalances(resolver, contracts) };
  },
};

export default adapter;

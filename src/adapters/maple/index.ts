import { Adapter, Balance, Contract } from "@lib/adapter";
import { getContractsFromGraph } from "./contracts"
import { getBalances } from "./balances"


const adapter: Adapter = {
  id: "maple",
  name: "Maple",
  coingecko: "maple",
  defillama: "maple",
  links: {
    website: "https://www.maple.finance/",
  },
  async getContracts() {
    return {
      contracts: await getContractsFromGraph(),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getBalances(ctx, "ethereum", contracts);

    return {
      balances: balances
    };
  },
};

export default adapter;

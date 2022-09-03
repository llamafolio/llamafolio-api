import { Adapter, Balance, Contract } from "@lib/adapter";
import { getPositions } from "./markets"

//example contract object
const contract: Contract = {
  name: "eulerMarkets",
  displayName: "Markets Euler",
  chain: "ethereum",
  address: "0x3520d5a913427E6F0D6A83E07ccD4A4da316e4d3",
};

const adapter: Adapter = {
  id: "euler",
  name: "Euler Finance",
  coingecko: "euler",
  defillama: "euler",
  links: {
    website: "https://www.euler.finance/",
  },
  async getContracts() {
    return {
      contracts: [contract],  //this should be an array of all contracts getBalances will look at
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getPositions(ctx, "ethereum", contracts); //any method to check all the contracts retrieved above

    return {
      balances,
    };
  },
};

export default adapter;

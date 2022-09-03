import { Adapter, Balance, Contract } from "@lib/adapter";
import { getBalances } from "./balances"


//example contract object
const vtxLocker: Contract = {
  name: "vectorLocker",
  displayName: "VTX Locker",
  chain: "avax",
  address: "0x574679Ec54972cf6d705E0a71467Bb5BB362919D",
};

const adapter: Adapter = {
  id: "",
  name: "",
  coingecko: "",
  defillama: "",
  links: {
    website: "",
  },
  async getContracts() {
    return {
      contracts: [vtxLocker],
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {

    let balances = await getBalances(ctx, "avax", contracts); 

    return {
      balances
    };
  },
};

export default adapter;

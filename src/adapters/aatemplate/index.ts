import { Adapter, Balance, Contract } from "@lib/adapter";

//example contract object
const contract: Contract = {
  name: "",
  displayName: "",
  chain: "ethereum",
  address: "0x3cf54f3a1969be9916dad548f3c084331c4450b5",
};

const adapter: Adapter = {
  // DefiLlama slug
  id: "",
  async getContracts() {
    return {
      contracts: [contract], //this should be an array of all contracts getBalances will look at
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getBalances(ctx, "ethereum", contracts); //any method to check all the contracts retrieved above

    return {
      balances,
    };
  },
};

export default adapter;

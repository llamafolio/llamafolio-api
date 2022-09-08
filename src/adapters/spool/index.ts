import { Adapter, Balance, Contract } from "@lib/adapter";
import { getBalances } from "./balances"
import { getContracts } from "./contracts"

//example contract object
const spoolController: Contract = {
  name: "spoolController",
  displayName: "Spool Controller",
  chain: "ethereum",
  address: "0xdd4051c3571c143b989c3227e8eb50983974835c",
};

const adapter: Adapter = {
  id: "spool-protocol",
  async getContracts() {
    return {
      contracts: await getContracts(spoolController),
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

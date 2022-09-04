import { Adapter, Balance, Contract } from "@lib/adapter";
import { getBalances } from "./balances"

//example contract object
const stabilityPool: Contract = {
  name: "stabPool",
  displayName: "Stability Pool",
  chain: "ethereum",
  address: "0x66017D22b0f8556afDd19FC67041899Eb65a21bb",
};
const troveManager: Contract = {
  name: "trove",
  displayName: "Trove Manager",
  chain: "ethereum",
  address: "0xa39739ef8b0231dbfa0dcda07d7e29faabcf4bb2",
};



const adapter: Adapter = {
  id: "liquity",
  async getContracts() {
    return {
      contracts: [stabilityPool, troveManager],  //this should be an array of all contracts getBalances will look at
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getBalances(ctx, "ethereum", contracts);


    return {
      balances
    };
  },
};

export default adapter;

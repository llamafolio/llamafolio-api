import { Adapter, Balance, Contract } from "@lib/adapter";
import { getVaults } from "./contracts";
import { getBalances } from "./balances";

const factoryArrakis: Contract = {
  name: "factory",
  displayName: "Arrakis Factory",
  chain: "ethereum",
  address: "0xEA1aFf9dbFfD1580F6b81A3ad3589E66652dB7D9",
};

const adapter: Adapter = {
  id: "arrakis-finance",
  async getContracts() {
    return {
      contracts: await getVaults(factoryArrakis),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getBalances(ctx, "ethereum", contracts);

    return {
      balances,
    };
  },
};

export default adapter;

import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getVaults } from "./contracts";
import { getLpBalances } from "./balances";

const factoryArrakis: Contract = {
  name: "factory",
  displayName: "Arrakis Factory",
  chain: "ethereum",
  address: "0xEA1aFf9dbFfD1580F6b81A3ad3589E66652dB7D9",
};

const getContracts = async () => {
  return {
    contracts: await getVaults(factoryArrakis),
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getLpBalances(ctx, "ethereum", contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "arrakis-finance",
  getContracts,
  getBalances,
};

export default adapter;

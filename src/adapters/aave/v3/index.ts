import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getLendingBalances } from "./balances";

const contracts: Contract[] = [
  {
    name: "poolAvax",
    displayName: "Pool Avalanche",
    chain: "avax",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  },
  {
    name: "poolOptimism",
    displayName: "Pool Optimism",
    chain: "optimism",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  },
  {
    name: "poolPolygon",
    displayName: "Pool Polygon",
    chain: "polygon",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  },
  {
    name: "poolFantom",
    displayName: "Pool Fantom",
    chain: "fantom",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  },
  {
    name: "poolArbitrum",
    displayName: "Pool Arbitrum",
    chain: "arbitrum",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  },
];

const getContracts = () => {
  return {
    contracts: contracts,
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getLendingBalances(ctx, contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "aave-v3",
  getContracts,
  getBalances,
};

export default adapter;

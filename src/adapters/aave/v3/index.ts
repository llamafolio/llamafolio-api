import { Adapter, Balance, Contract } from "@lib/adapter";
import { getBalances } from "./balances"

//example contract object
const contracts = [
  {
    name: "poolAvax",
    displayName: "Pool Avalanche",
    chain: "avax",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654"
  },
  {
    name: "poolOptimism",
    displayName: "Pool Optimism",
    chain: "optimism",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654"
  },
  {
    name: "poolPolygon",
    displayName: "Pool Polygon",
    chain: "polygon",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654"
  },
  {
    name: "poolFantom",
    displayName: "Pool Fantom",
    chain: "fantom",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654"
  },
  {
    name: "poolArbitrum",
    displayName: "Pool Arbitrum",
    chain: "arbitrum",
    address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654"
  },
];



const adapter: Adapter = {
  id: "aave-v3",
  name: "AAVE V3",
  coingecko: "aave",
  defillama: "aave-v3",
  links: {
    website: "https://app.aave.com/",
    doc: "https://docs.aave.com/hub/",
  },
  async getContracts() {
    return {
      contracts: contracts,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let balances = await getBalances(ctx, contracts);

    return {
      balances,
    };
  },
};

export default adapter;

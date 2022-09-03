import { Adapter, Balance, Contract } from "@lib/adapter";
import { getBalances } from "./balances"

//example contract object
const contracts = [
  {
    name: "lpStaking",
    displayName: "LP Staking Pool Mainnet",
    chain: "ethereum",
    address: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",
  },
  {
    name: "lpStaking",
    displayName: "LP Staking Pool Arbitrum",
    chain: "arbitrum",
    address: "0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176",
  },
  {
    name: "lpStaking",
    displayName: "LP Staking Pool Avalanche",
    chain: "avax",
    address: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
  },
  {
    name: "lpStaking",
    displayName: "LP Staking Pool BSC",
    chain: "bsc",
    address: "0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47",
  },
  {
    name: "lpStaking",
    displayName: "LP Staking Pool Polygon",
    chain: "polygon",
    address: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
  },
  {
    name: "lpStaking",
    displayName: "LP Staking Pool Fantom",
    chain: "fantom",
    address: "0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03",
  },
  {
    name: "lpStaking",
    displayName: "LP Staking Pool Optimism",
    chain: "optimism",
    address: "0x4DeA9e918c6289a52cd469cAC652727B7b412Cd2",
  },
];



const adapter: Adapter = {
  id: "stargate",
  name: "Stargate Finance",
  coingecko: "stargate-finance",
  defillama: "stargate",
  links: {
    website: "https://stargate.finance/",
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

import { Adapter } from "../../lib/adapter";
import { getPairsInfo } from "./pair";

const adapter: Adapter = {
  name: "Uniswap",
  description:
    "A fully decentralized protocol for automated liquidity provision on Ethereum.",
  coingecko: "uniswap",
  defillama: "uniswap",
  links: {
    website: "https://uniswap.org/",
  },
  async getContracts() {
    return { contracts: await getPairsInfo(), revalidate: 60 * 60 };
  },
  async getBalances() {
    return {
      balances: [],
    };
  },
};

export default adapter;

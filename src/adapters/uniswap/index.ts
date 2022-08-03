import { Adapter } from "@lib/adapter";
import { getERC20Balances } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

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
    return {
      contracts: await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx) {
    const balances = await getERC20Balances(ctx, "ethereum", [ctx.contract]);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "farm",
      })),
    };
  },
};

export default adapter;

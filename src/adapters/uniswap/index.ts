import { Adapter } from "../../lib/adapter";
import { getERC20Balances } from "../../lib/erc20";
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
  async getBalances(ctx) {
    const balances = await getERC20Balances(ctx, "ethereum", [ctx.contract]);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        amountFormatted: balance.amount.toString(),
        category: "farm",
      })),
    };
  },
};

export default adapter;

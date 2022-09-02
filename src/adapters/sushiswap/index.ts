import { Adapter } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "sushiswap",
  name: "SushiSwap",
  description:
    "A fully decentralized protocol for automated liquidity provision on Ethereum.",
  coingecko: "sushi",
  defillama: "sushiswap",
  links: {
    website: "https://sushi.com/",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
        length: 3109,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOf(ctx, "ethereum", contracts);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "farm",
      })),
    };
  },
};

export default adapter;

import { Adapter } from "@lib/adapter";
import { getERC20Balances } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "pangolin",
  name: "Pangolin",
  description: "Pangolin is a community-driven DEX that runs on Avalanche.",
  coingecko: "pangolin",
  defillama: "pangolin",
  links: {
    website: "https://pangolin.exchange",
    doc: "https://docs.pangolin.exchange",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "avax",
        factoryAddress: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20Balances(
      ctx,
      "avax",
      contracts.map((c) => c.address)
    );

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "farm",
      })),
    };
  },
};

export default adapter;

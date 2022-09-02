import { Adapter } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "trader-joe",
  name: "Trader Joe",
  description: "One-stop-shop decentralized trading on Avalanche",
  coingecko: "joe",
  defillama: "trader-joe",
  links: {
    website: "https://traderjoexyz.com",
    doc: "https://docs.traderjoexyz.com",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "avax",
        factoryAddress: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
        length: 100,
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20BalanceOf(ctx, "avax", contracts);

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "farm",
      })),
    };
  },
};

export default adapter;

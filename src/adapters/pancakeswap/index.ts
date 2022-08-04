import { Adapter } from "@lib/adapter";
import { getERC20Balances } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  name: "PancakeSwap",
  description: "",
  defillama: "pancakeswap",
  coingecko: "pancakeswap-token",
  links: {
    website: "https://pancakeswap.finance/",
    doc: "https://docs.pancakeswap.finance/",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "bsc",
        factoryAddress: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20Balances(
      ctx,
      "bsc",
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

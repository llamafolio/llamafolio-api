import { Adapter } from "@lib/adapter";
import { getERC20Balances } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "spiritswap",
  name: "Spiritswap",
  description: "",
  coingecko: "spiritswap",
  defillama: "spiritswap",
  links: {
    website: "https://www.spiritswap.finance/",
    doc: "https://docs.spiritswap.finance/spirit-swap/",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "fantom",
        factoryAddress: "0xEF45d134b73241eDa7703fa787148D9C9F4950b0",
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await getERC20Balances(
      ctx,
      "fantom",
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

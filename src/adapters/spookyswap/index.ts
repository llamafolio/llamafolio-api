import { Adapter } from "@lib/adapter";
import { getERC20Balances } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

const adapter: Adapter = {
  id: "spookyswap",
  name: "SpookySwap",
  description:
    "All in one decentralized exchange for leveraging diversified funds across ecosystems, with the speed of Fantom Opera",
  coingecko: "spookyswap",
  defillama: "spookyswap",
  links: {
    website: "https://spooky.fi",
    doc: "https://docs.spooky.fi",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "fantom",
        factoryAddress: "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3",
        length: 100,
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

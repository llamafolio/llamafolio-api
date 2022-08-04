import { Adapter } from "@lib/adapter";
import { getAllPools } from "./pools";
import { getGaugeBalances } from "./gauges"
import { getERC20Balances } from "@lib/erc20";


const adapter: Adapter = {
  name: "Curve",
  description:
    "A fully decentralized protocol for automated liquidity provision on Ethereum.",
  coingecko: "curve-dao-token",
  defillama: "curve",
  links: {
    website: "https://curve.fi/",
  },
  async getContracts() {
    return {
      contracts: await getAllPools(),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx) {


    //do pools only
    const balances = await getERC20Balances(ctx, "ethereum", [ctx.contract]);

    const gaugeBalances = await getGaugeBalances(ctx, "ethereum");

    return {
      balances: balances.map((balance) => ({
        ...balance,
        category: "liquidity-provider",
      })),
    };
  },
};

export default adapter;

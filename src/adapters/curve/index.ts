import { Adapter } from "../../lib/adapter";
import { getAllPools } from "./ethereum/pools";

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
  // async getBalances(ctx) {
  //   const balances = await getERC20Balances(ctx, "ethereum", [ctx.contract]);
  //
  //   return {
  //     balances: balances.map((balance) => ({
  //       ...balance,
  //       category: "farm",
  //     })),
  //   };
  // },
};

export default adapter;

import { Adapter } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";

// * * *
// Missing rewards BONE and things
// 




const adapter: Adapter = {
  id: "shibaswap",
  name: "ShibaSwap",
  coingecko: "bone-shibaswap",
  defillama: "shibaswap",
  links: {
    website: "https://shibaswap.com/#/",
  },
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0x115934131916C8b277DD010Ee02de363c09d037c",
        length: 100,
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

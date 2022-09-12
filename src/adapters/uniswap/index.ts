import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";

const adapter: Adapter = {
  id: "uniswap",
  async getContracts() {
    const pairs: Contract[] = (
      await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
        length: 100,
      })
    ).map((contract) => ({ ...contract, category: "farm" }));

    return {
      contracts: pairs,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let lpBalances = await getERC20BalanceOf(ctx, "ethereum", contracts);
    lpBalances = await getUnderlyingBalances("ethereum", lpBalances);

    return {
      balances: lpBalances,
    };
  },
};

export default adapter;

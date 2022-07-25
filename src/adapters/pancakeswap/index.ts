import { pools } from "./pools";
import { getBalances as getERC20Balances } from "../../lib/erc20";

const adapter = {
  name: "PancakeSwap",
  groups: [
    {
      chain: "bsc",
      type: "Farming",
      tokens: pools,
    },
  ],
  async getBalances(account: string) {
    const balances = await getERC20Balances(
      this.groups.flatMap((group) => group.tokens),
      account
    );

    const balanceByToken = {};
    for (const balance of balances) {
      balanceByToken[balance.address] = balance;
    }

    return this.groups.map((group) => {
      const tokens = group.tokens.flatMap(
        (token) => balanceByToken[token.address] || []
      );
      group.tokens = tokens;
      return group;
    });
  },
};

export default adapter;

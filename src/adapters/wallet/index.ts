import { providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "@lib/adapter";
import { tokens } from "@lib/chain";
import { Token } from "@lib/token";

const adapter: Adapter = {
  id: "wallet",
  name: "Wallet",
  description: "",
  defillama: "",
  links: {},
  getContracts() {
    return {
      contracts: tokens,
    };
  },
  async getBalances(ctx, contracts) {
    const balances = await Promise.all(
      (contracts as Token[]).map(async (token) => {
        const provider = providers[token.chain];
        const balance = await provider.getBalance(ctx.address);
        return {
          chain: token.chain,
          address: "",
          decimals: token.decimals,
          symbol: token.symbol,
          amount: balance,
          category: "wallet",
        } as Balance;
      })
    );

    return {
      balances,
    };
  },
};

export default adapter;

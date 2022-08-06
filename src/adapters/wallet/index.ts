import { providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "@lib/adapter";
import { toDefiLlama, tokens } from "@lib/chain";
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
  async getBalances(ctx, coins) {
    const balances = await Promise.all(
      (coins as Token[]).map(async (coin) => {
        const provider = providers[toDefiLlama(coin.chain)!];
        const balance = await provider.getBalance(ctx.address);
        return {
          chain: coin.chain,
          address: "",
          decimals: coin.decimals,
          symbol: coin.symbol,
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

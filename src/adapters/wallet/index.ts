import { providers } from "@defillama/sdk/build/general";
import { Adapter } from "@lib/adapter";
import { toDefiLlama, tokens } from "@lib/chain";

const adapter: Adapter = {
  name: "Wallet",
  description: "",
  links: {},
  getContracts() {
    return {
      contracts: tokens,
    };
  },
  async getBalances(ctx, coins) {
    const balances = await Promise.all(
      coins.map(async (coin) => {
        const provider = providers[toDefiLlama(coin.chain)!];
        const balance = await provider.getBalance(ctx.address);
        return {
          chain: coin.chain,
          address: "",
          decimals: coin.decimals,
          symbol: coin.symbol,
          amount: balance,
        };
      })
    );

    return {
      balances,
    };
  },
};

export default adapter;

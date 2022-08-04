import { providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "@lib/adapter";
import { chains, toDefiLlama, tokens } from "@lib/chain";

const adapter: Adapter = {
  name: "Wallet",
  description: "",
  links: {},
  getContracts() {
    return {
      contracts: tokens,
    };
  },
  async getBalances(ctx) {
    // TODO: deal with chains that have multiple coins
    const token = tokens.find((token) => token.chain === ctx.chain);
    if (!token) {
      return { balances: [] };
    }

    const provider = providers[toDefiLlama(ctx.chain)!];
    if (!provider) {
      return { balances: [] };
    }

    const balance = await provider.getBalance(ctx.address);

    return {
      balances: [
        {
          chain: ctx.chain,
          address: "",
          decimals: token.decimals,
          symbol: token.symbol,
          amount: balance,
        },
      ],
    };
  },
};

export default adapter;

import BN from "bignumber.js";
import { providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "../../lib/adapter";
import { chains, toDefiLlama } from "../../lib/chain";

const adapter: Adapter = {
  name: "Wallet",
  description: "",
  links: {},
  getContracts() {
    return {
      contracts: [],
    };
  },
  async getBalances(ctx) {
    const balances: (Balance | null)[] = await Promise.all(
      chains.flatMap(async (chain) => {
        const provider = providers[toDefiLlama(chain)!];
        if (!provider) {
          return [];
        }

        try {
          const balance = await provider.getBalance(ctx.address);

          return {
            chain,
            // TODO:
            decimals: 18,
            // TODO: map chains - token(s)
            symbol: chain.toLowerCase(),
            amount: new BN(balance.toString()),
          };
        } catch (error) {
          console.error(`[${chain}]: could not getBalance`, error);
          return null;
        }
      })
    );

    return {
      balances: balances.filter(
        (balanceRes) => balanceRes !== null && balanceRes.amount.gt(0)
      ),
    };
  },
};

export default adapter;

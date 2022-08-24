import fetch from "node-fetch";
import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "@lib/adapter";
import { chains } from "@lib/chain";
import { Token } from "@lib/token";

const adapter: Adapter = {
  id: "wallet",
  name: "Wallet",
  description: "",
  defillama: "",
  links: {},
  async getContracts() {
    const chainsInfoRes = await fetch("https://chainid.network/chains.json");
    const chainsInfo = await chainsInfoRes.json();

    const chainById: { [key: string]: Chain } = {};
    for (const chain of chains) {
      chainById[providers[chain].network.chainId] = chain;
    }

    const coinByChain: { [key: string]: Token } = {};
    for (const chainInfo of chainsInfo) {
      if (chainInfo.chainId in chainById) {
        if (!coinByChain[chainInfo.chain] && !chainInfo.parent) {
          coinByChain[chainInfo.chain] = {
            ...chainInfo.nativeCurrency,
            chain: chainById[chainInfo.chainId],
          };
        }
      }
    }

    const coins = Object.values(coinByChain);

    return {
      contracts: coins,
      revalidate: 60 * 60 * 24,
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

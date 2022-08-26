import { Contract, ethers } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "@lib/adapter";
import { Token } from "@lib/token";
import { getERC20BalanceOf } from "@lib/erc20";
import tokensByChain from "@llamafolio/tokens";

const adapter: Adapter = {
  id: "wallet",
  name: "Wallet",
  description: "",
  defillama: "",
  links: {},
  getContracts() {
    const contracts: Contract[] = [];

    for (const chain in tokensByChain) {
      for (const token of tokensByChain[chain]) {
        token.chain = chain;
        contracts.push(token);
      }
    }

    return {
      contracts,
    };
  },
  async getBalances(ctx, contracts) {
    const coins: Token[] = [];
    const tokensByChain: { [key: string]: Token[] } = {};

    for (const token of contracts) {
      // native chain coin
      if (token.address === ethers.constants.AddressZero) {
        coins.push(token as Token);
        continue;
      }

      // token
      if (!tokensByChain[token.chain]) {
        tokensByChain[token.chain] = [];
      }
      tokensByChain[token.chain]?.push(token as Token);
    }

    const coinsBalances = await Promise.all(
      coins.map(async (token) => {
        const provider = providers[token.chain];
        const balance = await provider.getBalance(ctx.address);
        return {
          chain: token.chain,
          address: "",
          decimals: token.decimals,
          symbol: token.symbol,
          amount: balance,
        };
      })
    );

    const tokensBalances = (
      await Promise.all(
        Object.keys(tokensByChain).map((chain) =>
          getERC20BalanceOf(ctx, chain as Chain, tokensByChain[chain])
        )
      )
    ).flat();

    return {
      balances: coinsBalances.concat(tokensBalances).map((balance) => {
        (balance as Balance).category = "wallet";
        return balance;
      }),
    };
  },
};

export default adapter;

import { ethers } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Balance, BaseBalance, Contract } from "@lib/adapter";
import { Token } from "@lib/token";
import { getERC20BalanceOf } from "@lib/erc20";
import { chains as tokensByChain } from "@llamafolio/tokens";
import { isNotNullish } from "@lib/type";

const adapter: Adapter = {
  id: "wallet",
  getContracts() {
    const contracts: Contract[] = [];

    for (const chain in tokensByChain) {
      for (const token of tokensByChain[chain]) {
        contracts.push({ ...token, chain: chain as Chain });
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

    const coinsBalances = (
      await Promise.all(
        coins.map(async (token) => {
          try {
            const provider = providers[token.chain];
            const balance = await provider.getBalance(ctx.address);
            (token as BaseBalance).amount = balance;
            return token;
          } catch (err) {
            console.error(
              `Failed to get coin balance for chain ${token.chain}`,
              err
            );
            return null;
          }
        })
      )
    ).filter(isNotNullish);

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

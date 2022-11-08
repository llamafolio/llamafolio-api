import { ethers } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Balance, Contract, GetBalancesHandler } from "@lib/adapter";
import { Token } from "@lib/token";
import { getERC20BalanceOf } from "@lib/erc20";
import { chains as tokensByChain } from "@llamafolio/tokens";
import { isNotNullish } from "@lib/type";
import { ContractsMap } from "@lib/map";

const getContracts = () => {
  const contracts: Contract[] = [];

  for (const chain in tokensByChain) {
    for (const token of tokensByChain[chain]) {
      // llamafolio-tokens registers all tokens to help get metadata but some are protocol specific (ex: stETH, aTokens).
      // wallet flag indicates wallet-only tokens
      if (token.wallet) {
        contracts.push({ ...token, chain: chain as Chain });
      }
    }
  }

  return {
    contracts,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const coins: Token[] = [];
  const tokensMap = new ContractsMap<Token>();

  for (const token of contracts) {
    // native chain coin
    if (token.address === ethers.constants.AddressZero) {
      coins.push(token as Token);
      continue;
    }

    tokensMap.add(token);
  }

  const coinsBalances = (
    await Promise.all(
      coins.map(async (token) => {
        try {
          const provider = providers[token.chain];
          const amount = await provider.getBalance(ctx.address);
          const balance: Balance = {
            ...token,
            amount,
          };
          return balance;
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

  const tokensBalances: Balance[] = (
    await Promise.all(
      tokensMap.map(([chain, tokens]) => getERC20BalanceOf(ctx, chain, tokens))
    )
  ).flat();

  return {
    balances: coinsBalances.concat(tokensBalances).map((balance) => {
      balance.category = "wallet";
      return balance;
    }),
  };
};

const adapter: Adapter = {
  id: "wallet",
  getContracts,
  getBalances,
};

export default adapter;

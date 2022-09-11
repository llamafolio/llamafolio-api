import { BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { BaseBalance, BaseContext } from "@lib/adapter";
import { Token } from "@lib/token";
import { getToken } from "@llamafolio/tokens";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";
import { isNotNullish } from "./type";

export const abi = {
  balanceOf: {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  decimals: {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  symbol: {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
};

export async function getERC20Balances(
  ctx: BaseContext,
  chain: Chain,
  tokens: string[]
): Promise<BaseBalance[]> {
  const details = await getERC20Details(chain, tokens);

  return getERC20BalanceOf(ctx, chain, details);
}

export async function getERC20BalanceOf(
  ctx: BaseContext,
  chain: Chain,
  tokens: Token[]
): Promise<BaseBalance[]> {
  const balances = await multicall({
    chain,
    calls: tokens.map((token) => ({
      target: token.address,
      params: [ctx.address],
    })),
    abi: abi.balanceOf,
  });

  return tokens
    .map((token, i) => {
      if (!balances[i].success || balances[i].output == null) {
        console.error(
          `Could not get balanceOf for token ${chain}:${token.address}`
        );
        return null;
      }

      (token as BaseBalance).amount = BigNumber.from(balances[i].output || "0");
      return token as BaseBalance;
    })
    .filter(isNotNullish);
}

//fetches balances with underlying for uniswap v2 and forks

export async function getERC20BalanceOfWithUnderlying(
  ctx: BaseContext,
  chain: Chain,
  tokens: Token[]
) {
  const balances = await multicall({
    chain,
    calls: tokens.map((token) => ({
      target: token.address,
      params: [ctx.address],
    })),
    abi: abi.balanceOf,
  });

  const mappedTokens = tokens
    .map((token, i) => {
      if (!balances[i].success || balances[i].output == null) {
        console.error(
          `Could not get balanceOf for token ${chain}:${token.address}`
        );
        return null;
      }

      if (balances[i].output > 0) {
        (token as BaseBalance).amount = BigNumber.from(
          balances[i].output || "0"
        );
        return token as BaseBalance;
      }
    })
    .filter(isNotNullish);

  return getUnderlyingBalances(chain, mappedTokens);
}

export async function getERC20Details(
  chain: Chain,
  tokens: string[]
): Promise<Token[]> {
  const found: { [key: string]: Token } = {};
  for (const address of tokens) {
    const tokenInfo = getToken(chain, address.toLowerCase());
    if (tokenInfo) {
      found[address] = tokenInfo;
    }
  }

  const missingTokens = tokens.filter((address) => !found[address]);

  const calls = missingTokens.map((address) => ({
    target: address,
    params: [],
  }));

  const [symbols, decimals] = await Promise.all([
    multicall({ chain, calls, abi: abi.symbol }),
    multicall({ chain, calls, abi: abi.decimals }),
  ]);

  for (let i = 0; i < missingTokens.length; i++) {
    const address = missingTokens[i];
    if (!symbols[i].success) {
      console.error(`Could not get symbol for token ${chain}:${address}`);
      continue;
    }
    if (!decimals[i].success) {
      console.error(`Could not get decimals for token ${chain}:${address}`);
      continue;
    }

    found[address] = {
      chain,
      address,
      symbol: symbols[i].output,
      decimals: parseInt(decimals[i].output),
    };
  }

  return tokens.map((address) => found[address]).filter(isNotNullish);
}

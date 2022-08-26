import { BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { BaseBalance, BaseContext } from "@lib/adapter";
import { Token } from "@lib/token";
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
  const symbols = await multicall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.symbol,
  });

  const decimals = await multicall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.decimals,
  });

  const balances = await multicall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [ctx.address],
    })),
    abi: abi.balanceOf,
  });

  return tokens
    .filter((address, i) => {
      if (!symbols[i].success || symbols[i].output == null) {
        console.error(`Could not get symbol for token ${chain}:${address}`);
        return false;
      }
      if (!decimals[i].success || decimals[i].output == null) {
        console.error(`Could not get decimals for token ${chain}:${address}`);
        return false;
      }
      if (!balances[i].success || balances[i].output == null) {
        console.error(`Could not get balanceOf for token ${chain}:${address}`);
        return false;
      }
      return true;
    })
    .map((address, i) => {
      return {
        chain,
        address,
        symbol: symbols[i].output,
        decimals: parseInt(decimals[i].output),
        amount: BigNumber.from(balances[i].output || "0"),
      };
    });
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

export async function getERC20Details(
  chain: Chain,
  tokens: string[]
): Promise<Token[]> {
  const symbols = await multicall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.symbol,
  });

  const decimals = await multicall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.decimals,
  });

  return tokens
    .filter((address, i) => {
      if (!symbols[i].success) {
        console.error(`Could not get symbol for token ${chain}:${address}`);
        return false;
      }
      if (!decimals[i].success) {
        console.error(`Could not get decimals for token ${chain}:${address}`);
        return false;
      }
      return true;
    })
    .map((address, i) => ({
      chain,
      address,
      symbol: symbols[i].output,
      decimals: parseInt(decimals[i].output),
    }));
}

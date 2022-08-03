import BN from "bignumber.js";
import { multicall } from "./multicall";
import { BaseBalance, BaseContext } from "./adapter";

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
  chain: string,
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

  return tokens.map((address, i) => ({
    // TODO: deal with .success
    chain,
    address,
    symbol: symbols[i].output,
    decimals: decimals[i].output,
    amount: new BN(balances[i].output),
  }));
}

export async function getERC20Details(
  chain: string,
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

  return tokens.map((address, i) => ({
    chain,
    address,
    symbol: symbols[i].output,
    decimals: decimals[i].output,
  }));
}

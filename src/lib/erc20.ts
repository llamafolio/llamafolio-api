import BN from "bignumber.js";
import { multiCall } from "@defillama/sdk/build/abi/index";
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
  const symbols = await multiCall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.symbol,
  });

  const decimals = await multiCall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.decimals,
  });

  const balances = await multiCall({
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
    symbol: symbols.output[i].output,
    decimals: decimals.output[i].output,
    amount: new BN(balances.output[i].output),
  }));
}



export async function getERC20Details(
  chain: string,
  tokens: string[]
): Promise<BaseBalance[]> {
  const symbols = await multiCall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.symbol,
  });

  const decimals = await multiCall({
    chain,
    calls: tokens.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.decimals,
  });

  return tokens.map((address, i) => ({
    // TODO: deal with .success
    chain,
    address,
    symbol: symbols.output[i].output,
    decimals: decimals.output[i].output,
  }));
}

import { Contract } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { multicall } from "../../lib/multicall";
import UniswapV2Factory from "./abis/UniswapV2Factory.json";

export async function getPairsInfo() {
  const provider = providers["ethereum"];
  const factory = new Contract(
    "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
    UniswapV2Factory,
    provider
  );

  // TODO: use logs table ?
  const allPairsLength = Math.min(
    (await factory.allPairsLength()).toNumber(),
    10
  );

  const allPairsRes = await multicall({
    chain: "ethereum",
    calls: Array(allPairsLength)
      .fill(undefined)
      .map((_, i) => ({
        target: factory.address,
        params: [i],
      })),
    abi: {
      constant: true,
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "allPairs",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const addresses = allPairsRes.map((res) => res.output);

  // TODO: use getERC20Details
  const symbols = await multicall({
    chain: "ethereum",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const decimals = await multicall({
    chain: "ethereum",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const token0s = await multicall({
    chain: "ethereum",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "token0",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const token1s = await multicall({
    chain: "ethereum",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "token1",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const pairs = addresses.map((_, i) => ({
    chain: "ethereum",
    address: addresses[i],
    symbol: symbols[i].output,
    decimals: decimals[i].output,
    token0: token0s[i].output,
    token1: token1s[i].output,
  }));

  const symbols0 = await multicall({
    chain: "ethereum",
    calls: pairs.map((pair) => ({
      target: pair.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const symbols1 = await multicall({
    chain: "ethereum",
    calls: pairs.map((pair) => ({
      target: pair.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const decimals0 = await multicall({
    chain: "ethereum",
    calls: pairs.map((pair) => ({
      target: pair.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const decimals1 = await multicall({
    chain: "ethereum",
    calls: pairs.map((pair) => ({
      target: pair.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  return pairs.map((pair, i) => ({
    ...pair,
    token0: {
      address: pair.token0,
      symbol: symbols0[i].output,
      decimals: decimals0[i].success
        ? parseInt(decimals0[i].output)
        : undefined,
    },
    token1: {
      address: pair.token1,
      symbol: symbols1[i].output,
      decimals: decimals1[i].success
        ? parseInt(decimals1[i].output)
        : undefined,
    },
  }));
}

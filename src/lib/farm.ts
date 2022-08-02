import { multiCall } from "@defillama/sdk/build/abi/index";

async function getPoolsInfo(addresses: string[]) {
  const symbols = await multiCall({
    chain: "bsc",
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

  const decimals = await multiCall({
    chain: "bsc",
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

  const token0s = await multiCall({
    chain: "bsc",
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

  const token1s = await multiCall({
    chain: "bsc",
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

  const pools = addresses.map((_, i) => ({
    // TODO: deal with names.success (boolean)
    chain: "bsc",
    address: addresses[i],
    symbol: symbols.output[i].output,
    decimals: decimals.output[i].output,
    token0: token0s.output[i].output,
    token1: token1s.output[i].output,
  }));

  const symbols0 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
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

  const symbols1 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
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

  const decimals0 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
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

  const decimals1 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
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

  return pools.map((pool, i) => ({
    ...pool,
    token0: {
      address: pool.token0,
      symbol: symbols0.output[i].output,
      decimals: decimals0.output[i].output,
    },
    token1: {
      address: pool.token1,
      symbol: symbols1.output[i].output,
      decimals: decimals1.output[i].output,
    },
  }));
}

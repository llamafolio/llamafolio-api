const { multiCall } = require("@defillama/sdk/build/abi/index");
const { pools } = require("./pools");
const { getBalances: getERC20Balances } = require("../../lib/erc20");

// NOTE: this should be stored in the DB or cached in memory and only called a few times
// as the top 1000 pools doesn't change much
async function getPools() {
  // TODO: Promise.all
  const names = await multiCall({
    chain: "bsc",
    calls: pools.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "name",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const symbols = await multiCall({
    chain: "bsc",
    calls: pools.map((address) => ({
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
    calls: pools.map((address) => ({
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

  // const token0s = await multiCall({
  //   chain: "bsc",
  //   calls: pools.map((address) => ({
  //     target: address,
  //     params: [],
  //   })),
  //   abi: {
  //     constant: true,
  //     inputs: [],
  //     name: "token0",
  //     outputs: [{ internalType: "address", name: "", type: "address" }],
  //     payable: false,
  //     stateMutability: "view",
  //     type: "function",
  //   },
  // });

  // const token1s = await multiCall({
  //   chain: "bsc",
  //   calls: pools.map((address) => ({
  //     target: address,
  //     params: [],
  //   })),
  //   abi: {
  //     constant: true,
  //     inputs: [],
  //     name: "token1",
  //     outputs: [{ internalType: "address", name: "", type: "address" }],
  //     payable: false,
  //     stateMutability: "view",
  //     type: "function",
  //   },
  // });

  return pools.map((_, i) => ({
    // TODO: deal with names.success (boolean)
    chain: "bsc",
    address: pools[i],
    name: names.output[i].output,
    symbol: symbols.output[i].output,
    decimals: decimals.output[i].output,
    // token0: token0s.output[i].output,
    // token1: token1s.output[i].output,
  }));
}

async function getBalances(account) {
  // TODO: sort by relevancy and cache
  const pools = await getPools();

  return getERC20Balances(pools, account);
}

module.exports = { getBalances };

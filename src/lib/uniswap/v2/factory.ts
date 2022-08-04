import { Contract } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import UniswapV2Factory from "./abis/UniswapV2Factory.json";
import { getERC20Details } from "@lib/erc20";

export type GetPairsInfoParams = {
  chain: string;
  factoryAddress: string;
};

export async function getPairsInfo({
  chain,
  factoryAddress,
}: GetPairsInfoParams) {
  const provider = providers[chain];
  const factory = new Contract(factoryAddress, UniswapV2Factory, provider);

  // TODO: use logs table ?
  const allPairsLength = Math.min(
    (await factory.allPairsLength()).toNumber(),
    10
  );

  const allPairsRes = await multicall({
    chain,
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

  const pairs = await getERC20Details(chain, addresses);

  const token0sRes = await multicall({
    chain,
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

  const token1sRes = await multicall({
    chain,
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

  const [token0s, token1s] = await Promise.all([
    getERC20Details(
      chain,
      pairs.map((_, i) => token0sRes[i].output)
    ),
    getERC20Details(
      chain,
      pairs.map((_, i) => token1sRes[i].output)
    ),
  ]);

  return pairs.map((pair, i) => ({
    ...pair,
    token0: token0s[i],
    token1: token1s[i],
  }));
}

import { providers } from "@defillama/sdk/build/general";
import { multicall } from "../../lib/multicall";
import { Contract } from "ethers";
import { Adapter } from "../../lib/adapter";
import UniswapV2Factory from "./abis/UniswapV2Factory.json";

const adapter: Adapter = {
  name: "Uniswap",
  description:
    "A fully decentralized protocol for automated liquidity provision on Ethereum.",
  coingecko: "uniswap",
  defillama: "uniswap",
  links: {
    website: "https://uniswap.org/",
  },
  async getContracts() {
    const factoryAddress = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f";
    const provider = providers["ethereum"];
    const factory = new Contract(factoryAddress, UniswapV2Factory, provider);

    // TODO: 
    const allPairsLength = Math.min((await factory.allPairsLength()).toNumber(), 100);

    const allPairs = await multicall({
      chain: "ethereum",
      calls: Array(allPairsLength)
        .fill(undefined)
        .map((_, i) => ({
          target: factoryAddress,
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

    console.log("==== ALL PAIRS", allPairs);

    return { contracts: [] };
  },
  async getBalances() {
    return {
      balances: [],
    };
  },
};

export default adapter;

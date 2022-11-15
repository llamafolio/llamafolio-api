export declare type Chain = "ethereum" | "bsc" | "polygon" | "fantom" | "xdai"|  "optimism" | "avax" | "arbitrum" | "celo" | "harmony" ;

// TODO: move to env variable
export const LLAMANODES_API_KEY = "01847bc5-060d-d120-8f16-1f2669cc884e"

export interface IChainInfo {
  id: Chain
  chainId: number,
  name: string,
  rpcUrl: string[]
}

// Currently supported chains
export const chains: IChainInfo[] = [
  {
    id: "arbitrum",
    chainId: 42161,
    name: "Arbitrum",
    rpcUrl: [`https://arbitrum-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
  {
    id: "avax",
    chainId: 43114,
    name: "Avalanche",
    // TODO: LlamaNodes RPC
    rpcUrl: [`https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc`]
  },
  {
    id: "bsc",
    chainId: 56,
    name: "BNB Chain",
    rpcUrl: [`https://bsc-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
  {
    id: "celo",
    chainId: 42220,
    name: "Celo",
    // TODO: LlamaNodes RPC
    rpcUrl: [`https://forno.celo.org`]
  },
  {
    id: "ethereum",
    chainId: 1,
    name: "Ethereum",
    rpcUrl: [`https://eth-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
  {
    id: "fantom",
    chainId: 250,
    name: "Fantom",
    rpcUrl: [`https://fantom-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
  {
    id: "harmony",
    chainId: 1666600000,
    name: "Harmony",
    // TODO: LlamaNodes RPC
    rpcUrl: [`https://api.harmony.one`]
  },
  {
    id: "polygon",
    chainId: 137,
    name: "Polygon",
    rpcUrl: [`https://polygon-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
  {
    id: "optimism",
    chainId: 10,
    name: "Optimism",
    rpcUrl: [`https://optimism-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
  {
    id: "xdai",
    chainId: 100,
    name: "Gnosis Chain",
    rpcUrl: [`https://gnosis-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`]
  },
];

export const chainById: { [key: string]: IChainInfo } = {};

for (const chain of chains) {
  chainById[chain.id] = chain
}
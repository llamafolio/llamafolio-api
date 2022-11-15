import ethers from "ethers";

export declare type Chain = "ethereum" | "bsc" | "polygon" | "fantom" | "xdai"|  "optimism" | "avax" | "arbitrum" ;

// TODO: move to env variable
export const LLAMANODES_API_KEY = "01847bc5-060d-d120-8f16-1f2669cc884e"

function createProvider(name: string, rpc: string, chainId: number) {
    return new ethers.providers.StaticJsonRpcProvider(
        rpc,
        {
          name,
          chainId,
        }
      )
  }

export const providers: { [chain in Chain]: ethers.providers.BaseProvider } = {
    "ethereum": createProvider("ethereum", `https://eth-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 1),
    "bsc": createProvider("bsc", `https://bsc-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 56),
    "polygon": createProvider("polygon", `https://polygon-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 137),
    "fantom": createProvider("fantom", `https://fantom-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 250),
    "xdai": createProvider("xdai", `https://gnosis-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 100),
    "optimism": createProvider("optimism", `https://optimism-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 10),
    "arbitrum": createProvider("arbitrum", `https://arbitrum-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, 42161),
    // TODO: LlamaNodes Avalanche RPC
    "avax": createProvider("avax", "https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc", 43114)
}
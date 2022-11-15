import ethers from "ethers";
import { chains } from "@lib/chains";



function createProvider(name: string, rpc: string, chainId: number) {
    return new ethers.providers.StaticJsonRpcProvider(
        rpc,
        {
          name,
          chainId,
        }
      )
  }

export const providers: { [chain: string]: ethers.providers.BaseProvider } = {}

for (const chain of chains) {
  providers[chain.id] = createProvider(chain.id, chain.rpcUrl, chain.chainId)
}
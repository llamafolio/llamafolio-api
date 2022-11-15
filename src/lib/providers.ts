import ethers from "ethers";
import { Chain, chains } from "@lib/chains";

function createProvider(name: string, rpcs: string[], chainId: number) {
  return new ethers.providers.FallbackProvider(
    rpcs.map((url, i) => ({
      provider: new ethers.providers.StaticJsonRpcProvider(
        url,
        {
          name,
          chainId,
        }
      ),
      priority: i
    })),
    1
  )
  }

export const providers: { [chain in Chain]: ethers.providers.BaseProvider } = Object.assign({})

for (const chain of chains) {
  providers[chain.id] = createProvider(chain.id, chain.rpcUrl, chain.chainId)
}
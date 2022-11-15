import { providers as ethersProviders}  from "ethers";
import { Chain, chains, IChainInfo } from "@lib/chains";

function createProvider(name: string, rpcs: string[], chainId: number) {
  return new ethersProviders.FallbackProvider(
    rpcs.map((url, i) => ({
      provider: new ethersProviders.StaticJsonRpcProvider(
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

export const providers: { [chain in Chain]: ethersProviders.BaseProvider } = Object.assign({})

for (const chain of chains) {
  providers[chain.id] = createProvider(chain.id, chain.rpcUrl, chain.chainId);
}


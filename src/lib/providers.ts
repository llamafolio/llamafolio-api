import { setProvider } from '@defillama/sdk/build/general'
import { Chain, chains } from '@lib/chains'
import { providers as ethersProviders } from 'ethers'

function createProvider(name: string, rpcs: string[], chainId: number) {
  // prioritize websocket RPC (better performance)
  if (rpcs[0].startsWith('wss')) {
    return new ethersProviders.WebSocketProvider(rpcs[0], chainId)
  }

  return new ethersProviders.StaticJsonRpcProvider(rpcs[0], {
    name,
    chainId,
  })
}

export const providers: { [chain in Chain]: ethersProviders.BaseProvider } = Object.assign({})

for (const chain of chains) {
  const provider = createProvider(chain.id, chain.rpcUrl, chain.chainId)
  providers[chain.id] = provider
  // update defillama sdk providers (used by calls and multicalls)
  setProvider(chain.id, provider)
}

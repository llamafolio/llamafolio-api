import { CUSTOM_PROVIDER } from '@env'
import { IChainInfo } from '@lib/chains'
import { ethers } from 'ethers'

import { FailoverProvider } from './failover-provider'
import { RetryProvider } from './retry-provider'
import { WebSocketFailoverProvider } from './websocket-failover-provider'

export type CustomProvider = 'http-fallback-retry' | 'http-failover' | 'ws-failover'

export function createJsonRpcProvider(chain: IChainInfo) {
  if (CUSTOM_PROVIDER === 'http-fallback-retry') {
    return new ethers.providers.FallbackProvider(
      chain.rpcUrls.map((url, i) => ({
        provider: new RetryProvider(
          new ethers.providers.StaticJsonRpcProvider(
            { url, allowGzip: true },
            { name: chain.id, chainId: chain.chainId },
          ),
          { timeout: 5000, floor: 1000, ceiling: 3000, retryLimit: 2 },
        ),

        priority: i,
      })),
      1,
    )
  }

  if (CUSTOM_PROVIDER === 'http-failover') {
    return new FailoverProvider(
      chain.rpcUrls.map(
        (url) =>
          new ethers.providers.StaticJsonRpcProvider(
            { url, allowGzip: true },
            { name: chain.id, chainId: chain.chainId },
          ),
      ),
    )
  }

  return new ethers.providers.FallbackProvider(
    chain.rpcUrls.map((url, i) => ({
      provider: new ethers.providers.StaticJsonRpcProvider(
        { url, allowGzip: true },
        { name: chain.id, chainId: chain.chainId },
      ),

      priority: i,
    })),
    1,
  )
}

export function createProvider(chain: IChainInfo) {
  // prioritize websocket RPC (better performance)
  if (CUSTOM_PROVIDER === 'ws-failover' && chain.rpcWssUrl) {
    return new WebSocketFailoverProvider(chain.rpcWssUrl, chain)
  }

  return createJsonRpcProvider(chain)
}

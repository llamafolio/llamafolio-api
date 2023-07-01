import type { IChainInfo } from '@lib/chains'
import type { HttpTransportConfig } from 'viem'
import { createPublicClient, fallback, http, webSocket } from 'viem'

import { viemChainById } from './chains'

export type Protocol = 'http' | 'ws'

/**
 * Example:
 *
 * ```ts
 * // http [default]
 * const client = evmClient('arbitrum')
 *
 * const blockNumber = await client.getBlockNumber()
 *
 * // ws
 * const wsClient = evmClient('arbitrum', { protocol: 'ws' })
 *
 * const wsBlockNumber = await wsClient.getBlockNumber()
 * ```
 */
export function evmClient(
  chain: IChainInfo,
  {
    protocol,
    options,
    httpTransportConfig,
  }: {
    protocol: Protocol
    options: Pick<Parameters<typeof createPublicClient>[0], 'batch' | 'key' | 'pollingInterval'>
    httpTransportConfig?: HttpTransportConfig
  } = {
    protocol: 'http',
    options: {
      // default
      pollingInterval: 4_000,
      batch: { multicall: { batchSize: 1_024, wait: 16 } },
    },
  },
) {
  const transport =
    protocol === 'ws' && chain.rpcWssUrl
      ? webSocket(chain.rpcWssUrl)
      : fallback(
          chain.rpcUrls.map((rpcURL) =>
            http(rpcURL, {
              ...httpTransportConfig,
              timeout: 10_000,
              retryDelay: 1_00,
            }),
          ),
        )
  return createPublicClient({
    name: 'llamafolio',
    chain: viemChainById[chain.id],
    transport,
    ...options,
  })
}

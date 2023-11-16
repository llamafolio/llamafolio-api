import type { IChainInfo } from '@lib/chains'
import { createPublicClient, fallback, type PublicClientConfig } from 'viem'

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
  }: {
    protocol: Protocol
    options: Pick<PublicClientConfig, 'batch' | 'key' | 'pollingInterval'>
  } = {
    protocol: 'http',
    options: {
      // default
      pollingInterval: 4_000,
      batch: { multicall: { batchSize: 1_024, wait: 16 } },
    },
  },
) {
  const transport = protocol === 'ws' && chain.rpcWssUrl ? fallback(chain.rpcWssUrl) : fallback(chain.rpcUrls)
  return createPublicClient({
    name: 'llamafolio',
    chain: viemChainById[chain.id],
    transport,
    ...options,
  })
}

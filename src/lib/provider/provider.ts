import { createPublicClient, fallback, http, webSocket } from 'viem'

import type { Network } from './constants'
import { chains, networks } from './constants'

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
 * console.log({ blockNumber })
 *
 * // ws
 * const wsClient = evmClient('arbitrum', { protocol: 'ws' })
 *
 * const wsBlockNumber = await wsClient.getBlockNumber()
 *
 * console.log({ wsBlockNumber })
 * ```
 */
export function evmClient(
  chain: Network,
  {
    protocol,
    options,
  }: {
    protocol: Protocol
    options: Pick<Parameters<typeof createPublicClient>[0], 'batch' | 'key' | 'pollingInterval'>
  } = {
    protocol: 'http',
    options: {
      // default
      pollingInterval: 4_000,
      batch: { multicall: { batchSize: 1_024, wait: 16 } },
    },
  },
) {
  const rpcURLs = networks[chain][protocol]
  return createPublicClient({
    name: 'llamafolio',
    chain: chains[chain],
    transport:
      protocol === 'ws'
        ? fallback(rpcURLs.map(webSocket), { rank: true })
        : fallback(rpcURLs.map((rpcURL) => http(rpcURL, { timeout: 60_000, retryDelay: 1_00 }))),
    ...options,
  })
}

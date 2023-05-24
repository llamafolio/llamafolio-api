import type { Chain, IChainInfo } from '@lib/chains'
import { createPublicClient, fallback, http, webSocket } from 'viem'
import type { Chain as _Chain } from 'viem/chains'
import {
  arbitrum,
  avalanche,
  bsc,
  celo,
  fantom,
  gnosis,
  harmonyOne as harmony,
  mainnet as ethereum,
  moonbeam,
  optimism,
  polygon,
} from 'viem/chains'

const viemChainById: { [key in Chain]: _Chain } = {
  arbitrum,
  avalanche,
  bsc,
  celo,
  ethereum,
  fantom,
  gnosis,
  harmony,
  moonbeam,
  optimism,
  polygon,
} as const

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
  return createPublicClient({
    name: 'llamafolio',
    chain: viemChainById[chain.id],
    transport:
      protocol === 'ws' && chain.rpcWssUrl
        ? webSocket(chain.rpcWssUrl)
        : fallback(chain.rpcUrls.map((rpcURL) => http(rpcURL, { timeout: 60_000, retryDelay: 1_00 }))),
    ...options,
  })
}

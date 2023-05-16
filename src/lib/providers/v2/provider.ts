import { createPublicClient, fallback, http, webSocket } from 'viem'

import type { Network } from './constants'
import { chains, httpProviders, wsProviders } from './constants'

export type Protocol = 'http' | 'ws'

// TODO: temp hack - remove when v2 provider fully integrated
const tmpChain = {
  harmony: 'harmonyOne',
  ethereum: 'mainnet',
}

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
  _chain:
    | Network
    // TODO: temp hack - remove when v2 provider fully integrated
    | keyof typeof tmpChain,
  {
    protocol,
    options,
  }: {
    protocol?: Protocol
    options?: Pick<Parameters<typeof createPublicClient>[0], 'batch' | 'key' | 'pollingInterval'>
  } = {
    protocol: 'http',
    options: {
      // default
      pollingInterval: 4_000,
      batch: { multicall: { batchSize: 1_024, wait: 16 } },
    },
  },
) {
  /**
   * temporary hack
   * TODO: remove when v2 provider fully integrated
   */
  // @ts-ignore
  const chain = (tmpChain[_chain] || _chain) as Network
  if (protocol === 'http') {
    return createPublicClient({
      name: 'llamafolio',
      chain: chains[chain],
      transport: trnasportProviders('http'),
      ...options,
    })
  }
  return createPublicClient({
    name: 'llamafolio',
    chain: chains[chain],
    transport: trnasportProviders('ws'),
    ...options,
  })
}

// http [default]
// const client = evmClient('localhost', { protocol: 'http' })

// const blockNumber = await client.getBlockNumber()

// console.log({ blockNumber })

// // ws
// const wsClient = evmClient('arbitrum', { protocol: 'ws' })

// const wsBlockNumber = await wsClient.getBlockNumber()

// console.log({ wsBlockNumber })

export function trnasportProviders(protocol: Protocol = 'http', options?: Parameters<typeof http>[1]) {
  const providers =
    protocol === 'http'
      ? httpProviders.map((url) => http(url, options))
      : wsProviders.map((url) => webSocket(url, options))
  return fallback(providers)
}

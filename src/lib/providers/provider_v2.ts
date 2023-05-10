import assert from 'node:assert'

import { environment } from '@environment'
import { createPublicClient, fallback, http, webSocket } from 'viem'
import { arbitrum, bsc, canto, celo, harmonyOne, mainnet, optimism, polygon } from 'viem/chains'

export type Protocol = 'http' | 'ws'

export const invariant = (condition: unknown, message?: string): asserts condition => assert(condition, message)

export const chains = {
  mainnet,
  polygon,
  optimism,
  harmonyOne,
  canto,
  celo,
  arbitrum,
  bsc,
}

const alchemyHTTP = `https://eth-mainnet.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`
const alchemyWS = `wss://eth-mainnet.ws.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`
const infuraHTTP = `https://mainnet.infura.io/v3/${environment.INFURA_API_KEY}`
const infuraWS = `wss://mainnet.infura.io/ws/v3/${environment.INFURA_API_KEY}`
const cloudflareHTTP = `https://cloudflare-eth.com`
const ankrHTTP = `https://rpc.ankr.com/eth/${environment.ANKR_API_KEY}`
const ankrWS = `wss://rpc-ws.ankr.com/eth/${environment.ANKR_API_KEY}`
const llamafolioHTTP = `https://api.llamafolio.com/eth/mainnet`

const thirdPartyHttpProviders = [alchemyHTTP, infuraHTTP, cloudflareHTTP, ankrHTTP, llamafolioHTTP]
const thirdPartyWSProviders = [alchemyWS, infuraWS, ankrWS]

export const trnasportProviders = (protocol: Protocol = 'http', options?: Parameters<typeof http>[1]) => {
  const providers =
    protocol === 'http'
      ? thirdPartyHttpProviders.map((url) => http(url, options))
      : thirdPartyWSProviders.map((url) => webSocket(url, options))
  return fallback(providers)
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
  chain: keyof typeof chains,
  {
    protocol,
    batchOptions,
  }: {
    protocol?: 'http' | 'ws'
    batchOptions?: Parameters<typeof createPublicClient>[0]['batch']
  } = { protocol: 'http', batchOptions: { multicall: { batchSize: 1_024, wait: 16 } } },
) {
  if (protocol === 'http') {
    return createPublicClient({
      name: 'llamafolio',
      chain: chains[chain],
      transport: trnasportProviders('http'),
      batch: batchOptions,
    })
  }
  return createPublicClient({
    name: 'llamafolio',
    chain: chains[chain],
    transport: trnasportProviders('ws'),
    batch: batchOptions,
  })
}

// http [default]
const client = evmClient('arbitrum')

const blockNumber = await client.getBlockNumber()

console.log({ blockNumber })

// ws
const wsClient = evmClient('arbitrum', { protocol: 'ws' })

const wsBlockNumber = await wsClient.getBlockNumber()

console.log({ wsBlockNumber })

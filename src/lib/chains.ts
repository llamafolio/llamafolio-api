import { ADDRESS_ZERO } from '@lib/contract'
import type { Address, PublicClient } from 'viem'
import { createPublicClient, fallback, http } from 'viem'
import * as viemChains from 'viem/chains'

/**
 * Supported chains
 */
export const chainsNames = [
  'arbitrum',
  'arbitrum-nova',
  'avalanche',
  'bsc',
  'base',
  'celo',
  'ethereum',
  'fantom',
  'gnosis',
  'harmony',
  'linea',
  'moonbeam',
  'opbnb',
  'optimism',
  'polygon',
  'polygon-zkevm',
  'zksync-era',
  'linea',
] as const

export type Chain = (typeof chainsNames)[number]

export interface IChainInfo {
  id: Chain
  chainId: number
  name: string
  nativeCurrency: {
    address: Address
    decimals: number
    name: string
    symbol: string
  }
  indexed?: boolean
}

// Currently supported chains
export const chains = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'arbitrum-nova',
    chainId: 42170,
    name: 'Arbitrum Nova',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'avalanche',
    chainId: 43114,
    name: 'Avalanche',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Avalanche',
      symbol: 'AVAX',
    },
    indexed: true,
  },
  {
    id: 'base',
    chainId: 8453,
    name: 'Base',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'bsc',
    chainId: 56,
    name: 'BNB Chain',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Binance Coin',
      symbol: 'BNB',
    },
    indexed: true,
  },
  {
    id: 'celo',
    chainId: 42220,
    name: 'Celo',
    nativeCurrency: {
      address: '0x471ece3750da237f93b8e339c536989b8978a438',
      decimals: 18,
      name: 'Celo',
      symbol: 'CELO',
    },
    indexed: false,
  },
  {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'fantom',
    chainId: 250,
    name: 'Fantom',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Fantom',
      symbol: 'FTM',
    },
    indexed: true,
  },
  {
    id: 'gnosis',
    chainId: 100,
    name: 'Gnosis Chain',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'xDai',
      symbol: 'xDAI',
    },
    indexed: true,
  },
  {
    id: 'harmony',
    chainId: 1666600000,
    name: 'Harmony',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'One',
      symbol: 'ONE',
    },
    indexed: false,
  },
  {
    id: 'linea',
    chainId: 59144,
    name: 'Linea',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'moonbeam',
    chainId: 1284,
    name: 'Moonbeam',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Glimmer',
      symbol: 'GLMR',
    },
    indexed: true,
  },
  {
    id: 'opbnb',
    chainId: 204,
    name: 'opBNB',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'BNB',
      symbol: 'BNB',
    },
    indexed: true,
  },
  {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'polygon',
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Matic',
      symbol: 'MATIC',
    },
    indexed: true,
  },
  {
    id: 'polygon-zkevm',
    chainId: 1101,
    name: 'Polygon ZKEVM',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
  {
    id: 'zksync-era',
    chainId: 324,
    name: 'zkSync-Era',
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
] satisfies IChainInfo[]

export const chainIds = chains.map((chain) => chain.chainId)

export const chainById: { [key: string]: IChainInfo } = {}

for (const chain of chains) {
  chainById[chain.id] = chain
}

export const chainByChainId: { [key: number]: IChainInfo } = {}

for (const chain of chains) {
  chainByChainId[chain.chainId] = chain
}

export const toDefiLlamaChain: { [key in Chain]: string } = {
  arbitrum: 'arbitrum',
  'arbitrum-nova': 'arbitrum nova',
  avalanche: 'avax',
  base: 'base',
  bsc: 'bsc',
  celo: 'celo',
  ethereum: 'ethereum',
  fantom: 'fantom',
  gnosis: 'xdai',
  harmony: 'harmony',
  moonbeam: 'moonbeam',
  opbnb: 'opbnb',
  optimism: 'optimism',
  polygon: 'polygon',
  linea: 'linea',
  'polygon-zkevm': 'polygon zkevm',
  'zksync-era': 'zksync era',
}

export const fromDefiLlamaChain: { [key: string]: Chain } = {
  Arbitrum: 'arbitrum',
  'Arbitrum Nova': 'arbitrum-nova',
  Avalanche: 'avalanche',
  BSC: 'bsc',
  Base: 'base',
  Celo: 'celo',
  Ethereum: 'ethereum',
  Fantom: 'fantom',
  Gnosis: 'gnosis',
  Linea: 'linea',
  Moonbeam: 'moonbeam',
  opBNB: 'opbnb',
  Optimism: 'optimism',
  Polygon: 'polygon',
  'Polygon zkEVM': 'polygon-zkevm',
  'zkSync Era': 'zksync-era',
}

export function getChainId(chain: string) {
  return (chainById[chain] || chainById[fromDefiLlamaChain[chain]] || chainByChainId[chain as unknown as number])
    ?.chainId
}

interface RPCClientOptions {
  chain: Chain
  /**
   * @default false
   */
  retry?: boolean
}

export function getRPCClient(options: RPCClientOptions): PublicClient {
  switch (options.chain) {
    case 'arbitrum':
      return createPublicClient({
        chain: viemChains.arbitrum,
        transport: fallback([
          http('https://rpc.ankr.com/arbitrum', { batch: { wait: 10, batchSize: 5_000 } }),
          http('https://arb1.arbitrum.io/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'arbitrum-nova':
      return createPublicClient({
        chain: viemChains.arbitrumNova,
        transport: fallback([http('https://nova.arbitrum.io/rpc', { batch: { wait: 0, batchSize: 5_000 } })]),
      })

    case 'avalanche':
      return createPublicClient({
        chain: viemChains.avalanche,
        transport: fallback([
          http('https://rpc.ankr.com/avalanche', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://avalanche.public-rpc.com', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://api.avax.network/ext/bc/C/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'base':
      return createPublicClient({
        chain: viemChains.base,
        transport: fallback([
          http('https://base-mainnet.public.blastapi.io', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://mainnet.base.org', { batch: { wait: 0, batchSize: 1_000 } }),
        ]),
      })

    case 'bsc':
      return createPublicClient({
        chain: viemChains.bsc,
        transport: fallback([
          http('https://bsc-dataseed.binance.org/', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://bsc-dataseed1.ninicoin.io/', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'celo':
      return createPublicClient({
        chain: viemChains.celo,
        transport: fallback([
          http('https://rpc.ankr.com/celo', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://forno.celo.org', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'ethereum':
      return createPublicClient({
        chain: viemChains.mainnet,
        transport: fallback([
          http('https://rpc.ankr.com/eth', { batch: { wait: 32, batchSize: 1000 } }),
          http('https://cloudflare-eth.com', { batch: { wait: 32, batchSize: 1000 } }),
        ]),
        batch: {
          multicall: {
            wait: 32,
            batchSize: 1000,
          },
        },
      })

    case 'fantom':
      return createPublicClient({
        chain: viemChains.fantom,
        transport: fallback([
          http('https://rpc.ankr.com/fantom', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://rpc.ftm.tools/', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://rpcapi.fantom.network', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'gnosis':
      return createPublicClient({
        chain: viemChains.gnosis,
        transport: fallback([
          http('https://rpc.ankr.com/gnosis', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://rpc.gnosischain.com', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://xdai-archive.blockscout.com', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'harmony':
      return createPublicClient({
        chain: viemChains.harmonyOne,
        transport: fallback([
          http('https://rpc.ankr.com/harmony', { batch: { wait: 0, batchSize: 5_000 } }),
          http(`https://api.harmony.one`, { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://harmony-0-rpc.gateway.pokt.network', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://api.s0.t.hmny.io', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'linea':
      return createPublicClient({
        chain: viemChains.linea,
        transport: fallback([
          http('https://linea.blockpi.network/v1/rpc/public', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://rpc.linea.build', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://1rpc.io/linea', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'moonbeam':
      return createPublicClient({
        chain: viemChains.moonbeam,
        transport: fallback([
          http('https://rpc.ankr.com/moonbeam', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://rpc.api.moonbeam.network', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://rpc.ankr.com/moonbeam', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'opbnb':
      return createPublicClient({
        chain: viemChains.opBNB,
        transport: fallback([http('https://opbnb.publicnode.com'), http('https://opbnb-mainnet-rpc.bnbchain.org')]),
      })

    case 'optimism':
      return createPublicClient({
        chain: viemChains.optimism,
        transport: fallback([
          http('https://rpc.ankr.com/optimism', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://mainnet.optimism.io', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'polygon':
      return createPublicClient({
        chain: viemChains.polygon,
        transport: fallback([
          http('https://rpc.ankr.com/polygon', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://polygon-rpc.com/', { batch: { batchSize: 1_000, wait: 10 } }),
          http('https://rpc-mainnet.maticvigil.com/', { batch: { batchSize: 1_000, wait: 10 } }),
        ]),
      })

    case 'polygon-zkevm':
      return createPublicClient({
        chain: viemChains.polygonZkEvm,
        transport: fallback([
          http('https://zkevm-rpc.com', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://rpc.ankr.com/polygon_zkevm', { batch: { wait: 0, batchSize: 5_000 } }),
        ]),
      })

    case 'zksync-era':
      return createPublicClient({
        chain: viemChains.zkSync,
        transport: fallback([
          http('https://mainnet.era.zksync.io', { batch: { wait: 0, batchSize: 5_000 } }),
          http('https://zksync-era.blockpi.network/v1/rpc/public', { batch: { wait: 0, batchSize: 1_000 } }),
          http('https://zksync.drpc.org', { batch: { wait: 0, batchSize: 1_000 } }),
        ]),
      })
  }
}

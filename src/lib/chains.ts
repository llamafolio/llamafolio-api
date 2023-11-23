import environment from '@environment'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Address, PublicClient } from 'viem'
import { createPublicClient, fallback, http, webSocket } from 'viem'
import * as viemChains from 'viem/chains'

const { LLAMANODES_API_KEY } = environment

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
  client: PublicClient
  indexed?: boolean
}

// Currently supported chains
export const chains = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    client: createPublicClient({
      chain: viemChains.arbitrum,
      transport: fallback([
        webSocket(getLlamaNodesUrl('wss://arbitrum.llamarpc.com')),
        http('https://rpc.ankr.com/arbitrum', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://arb1.arbitrum.io/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.arbitrumNova,
      transport: fallback([http('https://nova.arbitrum.io/rpc', { batch: { wait: 0, batchSize: 5_000 } })]),
    }),
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
    client: createPublicClient({
      chain: viemChains.avalanche,
      transport: fallback([
        http('https://rpc.ankr.com/avalanche', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://avalanche.public-rpc.com', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://api.avax.network/ext/bc/C/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.base,
      transport: fallback([
        webSocket(getLlamaNodesUrl('wss://base.llamarpc.com')),
        http('https://base-mainnet.public.blastapi.io', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://mainnet.base.org', { batch: { wait: 0, batchSize: 1_000 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.bsc,
      transport: fallback([
        webSocket(getLlamaNodesUrl('wss://binance.llamarpc.com')),
        http('https://bsc-dataseed.binance.org/', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://bsc-dataseed1.ninicoin.io/', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.celo,
      transport: fallback([
        http('https://rpc.ankr.com/celo', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://forno.celo.org', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.mainnet,
      transport: fallback([
        webSocket(getLlamaNodesUrl('wss://eth.llamarpc.com')),
        http('https://rpc.ankr.com/eth', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79', {
          batch: { wait: 10, batchSize: 1_000 },
        }),
        http('https://cloudflare-eth.com', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.fantom,
      transport: fallback([
        http('https://rpc.ankr.com/fantom', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://rpc.ftm.tools/', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://rpcapi.fantom.network', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.gnosis,
      transport: fallback([
        http('https://rpc.ankr.com/gnosis', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://rpc.gnosischain.com', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://xdai-archive.blockscout.com', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.harmonyOne,
      transport: fallback([
        http('https://rpc.ankr.com/harmony', { batch: { wait: 0, batchSize: 5_000 } }),
        http(`https://api.harmony.one`, { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://harmony-0-rpc.gateway.pokt.network', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://api.s0.t.hmny.io', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.linea,
      transport: fallback([
        http('https://linea.blockpi.network/v1/rpc/public', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://rpc.linea.build', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://1rpc.io/linea', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.moonbeam,
      transport: fallback([
        http('https://rpc.ankr.com/moonbeam', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://rpc.api.moonbeam.network', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://rpc.ankr.com/moonbeam', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.opBNB,
      transport: fallback([http('https://opbnb.publicnode.com'), http('https://opbnb-mainnet-rpc.bnbchain.org')]),
    }),
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
    client: createPublicClient({
      chain: viemChains.optimism,
      transport: fallback([
        webSocket(getLlamaNodesUrl('wss://optimism.llamarpc.com')),
        http('https://rpc.ankr.com/optimism', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://mainnet.optimism.io', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.polygon,
      transport: fallback([
        webSocket(getLlamaNodesUrl('wss://polygon.llamarpc.com')),
        http('https://rpc.ankr.com/polygon', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://polygon-rpc.com/', { batch: { batchSize: 1_000, wait: 10 } }),
        http('https://rpc-mainnet.maticvigil.com/', { batch: { batchSize: 1_000, wait: 10 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.polygonZkEvm,
      transport: fallback([
        http('https://zkevm-rpc.com', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://rpc.ankr.com/polygon_zkevm', { batch: { wait: 0, batchSize: 5_000 } }),
      ]),
    }),
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
    client: createPublicClient({
      chain: viemChains.zkSync,
      transport: fallback([
        http('https://mainnet.era.zksync.io', { batch: { wait: 0, batchSize: 5_000 } }),
        http('https://zksync-era.blockpi.network/v1/rpc/public', { batch: { wait: 0, batchSize: 1_000 } }),
        http('https://zksync.drpc.org', { batch: { wait: 0, batchSize: 1_000 } }),
      ]),
    }),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    indexed: true,
  },
] satisfies IChainInfo[]

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

/**
 * Get LLamaNodes Premium RPC URL if API key specified in environment, free RPC otherwise
 * @param baseEndpoint
 */
function getLlamaNodesUrl(baseEndpoint: string) {
  return LLAMANODES_API_KEY ? `${baseEndpoint}/rpc/${LLAMANODES_API_KEY}` : baseEndpoint
}

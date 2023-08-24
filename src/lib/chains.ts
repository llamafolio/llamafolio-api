import environment from '@environment'
import { ADDRESS_ZERO } from '@lib/contract'
import { isNotFalsy } from '@lib/type'
import type { Address, HttpTransport, WebSocketTransport } from 'viem'
import { http, webSocket } from 'viem'

const { ARBITRUM_RPC, LLAMANODES_API_KEY, OPTIMISM_RPC } = environment

/**
 * Supported chains
 */
export const chainsNames = [
  'arbitrum',
  'avalanche',
  'bsc',
  'base',
  'celo',
  'ethereum',
  'fantom',
  'gnosis',
  'harmony',
  'moonbeam',
  'optimism',
  'polygon',
  'polygon-zkevm',
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
  // adjust transport config based on RPC endpoints
  rpcWssUrl?: WebSocketTransport[]
  rpcUrls: HttpTransport[]
}

// Currently supported chains
export const chains = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrls: [
      http('https://rpc.ankr.com/arbitrum', { batch: { wait: 0, batchSize: 5_000 } }),
      ARBITRUM_RPC ? http(ARBITRUM_RPC, { batch: { batchSize: 1_000, wait: 10 } }) : undefined,
      http('https://arb1.arbitrum.io/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
    ].filter(isNotFalsy),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  {
    id: 'arbitrum-nova',
    chainId: 42170,
    name: 'Arbitrum Nova',
    rpcUrls: [http('https://nova.arbitrum.io/rpc', { batch: { wait: 0, batchSize: 5_000 } })],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  {
    id: 'avalanche',
    chainId: 43114,
    name: 'Avalanche',
    rpcUrls: [
      http('https://rpc.ankr.com/avalanche', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://avalanche.public-rpc.com', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://api.avax.network/ext/bc/C/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Avalanche',
      symbol: 'AVAX',
    },
  },
  {
    id: 'base',
    chainId: 8453,
    name: 'Base',
    rpcUrls: [
      http('https://base-mainnet.public.blastapi.io', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://mainnet.base.org', { batch: { wait: 0, batchSize: 1_000 } }),
      http('https://1rpc.io/base', { batch: { wait: 0, batchSize: 1_000 } }),
      http('https://base.blockpi.network/v1/rpc/public', { batch: { wait: 0, batchSize: 1_000 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  {
    id: 'bsc',
    chainId: 56,
    name: 'BNB Chain',
    rpcUrls: [
      http('https://rpc.ankr.com/bsc', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://bsc-dataseed.binance.org/', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://bsc-dataseed1.ninicoin.io/', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://bsc-dataseed2.defibit.io/', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://bsc-dataseed2.ninicoin.io/', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Binance Coin',
      symbol: 'BNB',
    },
  },
  {
    id: 'celo',
    chainId: 42220,
    name: 'Celo',
    rpcUrls: [
      http('https://rpc.ankr.com/celo', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://forno.celo.org', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: '0x471ece3750da237f93b8e339c536989b8978a438',
      decimals: 18,
      name: 'Celo',
      symbol: 'CELO',
    },
  },
  {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    rpcWssUrl: [LLAMANODES_API_KEY ? webSocket(`wss://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}`) : undefined].filter(
      isNotFalsy,
    ),
    rpcUrls: [
      LLAMANODES_API_KEY
        ? http(`https://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, { batch: { wait: 0, batchSize: 5_000 } })
        : undefined,
      http('https://rpc.ankr.com/eth', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79', {
        batch: { wait: 10, batchSize: 1_000 },
      }),
      http('https://cloudflare-eth.com', { batch: { batchSize: 1_000, wait: 10 } }),
    ].filter(isNotFalsy),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  {
    id: 'fantom',
    chainId: 250,
    name: 'Fantom',
    rpcUrls: [
      http('https://rpc.ankr.com/fantom', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://rpc.ftm.tools/', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://rpcapi.fantom.network', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Fantom',
      symbol: 'FTM',
    },
  },
  {
    id: 'gnosis',
    chainId: 100,
    name: 'Gnosis Chain',
    rpcUrls: [
      http('https://rpc.ankr.com/gnosis', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://rpc.gnosischain.com', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://xdai-archive.blockscout.com', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'xDai',
      symbol: 'xDAI',
    },
  },
  {
    id: 'harmony',
    chainId: 1666600000,
    name: 'Harmony',
    rpcUrls: [
      http('https://rpc.ankr.com/harmony', { batch: { wait: 0, batchSize: 5_000 } }),
      http(`https://api.harmony.one`, { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://harmony-0-rpc.gateway.pokt.network', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://api.s0.t.hmny.io', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'One',
      symbol: 'ONE',
    },
  },
  {
    id: 'polygon',
    chainId: 137,
    name: 'Polygon',
    rpcWssUrl: [
      LLAMANODES_API_KEY ? webSocket(`wss://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}`) : undefined,
    ].filter(isNotFalsy),
    rpcUrls: [
      LLAMANODES_API_KEY
        ? http(`https://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}`, { batch: { wait: 0, batchSize: 5_000 } })
        : undefined,
      http('https://rpc.ankr.com/polygon', { batch: { wait: 0, batchSize: 5_000 } }),

      http('https://polygon-rpc.com/', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://rpc-mainnet.maticvigil.com/', { batch: { batchSize: 1_000, wait: 10 } }),
    ].filter(isNotFalsy),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Matic',
      symbol: 'MATIC',
    },
  },
  {
    id: 'polygon-zkevm',
    chainId: 1101,
    name: 'Polygon ZKEVM',
    rpcUrls: [
      http('https://zkevm-rpc.com', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://rpc.ankr.com/polygon_zkevm', { batch: { wait: 0, batchSize: 5_000 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  {
    id: 'moonbeam',
    chainId: 1284,
    name: 'Moonbeam',
    rpcUrls: [
      http('https://rpc.ankr.com/moonbeam', { batch: { wait: 0, batchSize: 5_000 } }),
      http('https://rpc.api.moonbeam.network', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://rpc.ankr.com/moonbeam', { batch: { batchSize: 1_000, wait: 10 } }),
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Glimmer',
      symbol: 'GLMR',
    },
  },
  {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    rpcUrls: [
      http('https://rpc.ankr.com/optimism', { batch: { wait: 0, batchSize: 5_000 } }),
      OPTIMISM_RPC ? http(OPTIMISM_RPC, { batch: { batchSize: 1_000, wait: 10 } }) : undefined,
      http('https://optimism.publicnode.com', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://optimism-mainnet.public.blastapi.io', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://1rpc.io/op', { batch: { batchSize: 1_000, wait: 10 } }),
      http('https://mainnet.optimism.io', { batch: { batchSize: 1_000, wait: 10 } }),
    ].filter(isNotFalsy),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
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
  avalanche: 'avax',
  bsc: 'bsc',
  celo: 'celo',
  ethereum: 'ethereum',
  fantom: 'fantom',
  gnosis: 'xdai',
  harmony: 'harmony',
  moonbeam: 'moonbeam',
  optimism: 'optimism',
  polygon: 'polygon',
  base: 'base',
}

export const fromDefiLlamaChain: { [key: string]: Chain } = {
  Arbitrum: 'arbitrum',
  Avalanche: 'avalanche',
  BSC: 'bsc',
  Celo: 'celo',
  Ethereum: 'ethereum',
  Fantom: 'fantom',
  Gnosis: 'gnosis',
  Moonbeam: 'moonbeam',
  Optimism: 'optimism',
  Polygon: 'polygon',
  base: 'base',
}

import environment from '@environment'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Address } from 'viem'

import { isNotNullish } from './type'

const { ARBITRUM_RPC, LLAMANODES_API_KEY, OPTIMISM_RPC } = environment

export declare type Chain =
  | 'arbitrum'
  | 'avalanche'
  | 'bsc'
  | 'celo'
  | 'ethereum'
  | 'fantom'
  | 'gnosis'
  | 'harmony'
  | 'moonbeam'
  | 'optimism'
  | 'polygon'

export const chainsNames = [
  'arbitrum',
  'avalanche',
  'bsc',
  'celo',
  'ethereum',
  'fantom',
  'gnosis',
  'harmony',
  'moonbeam',
  'optimism',
  'polygon',
] as const

export interface IChainInfo {
  id: Chain
  chainId: number
  name: string
  rpcWssUrl?: string
  rpcUrls: string[]
  nativeCurrency: {
    address: Address
    decimals: number
    name: string
    symbol: string
  }
}

// Currently supported chains
export const chains = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrls: [ARBITRUM_RPC, 'https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'].filter(isNotNullish),
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
      'https://avalanche.public-rpc.com',
      'https://api.avax.network/ext/bc/C/rpc',
      'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc',
    ],
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Avalanche',
      symbol: 'AVAX',
    },
  },
  {
    id: 'bsc',
    chainId: 56,
    name: 'BNB Chain',
    rpcUrls: [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/',
      'https://bsc-dataseed2.defibit.io/',
      'https://bsc-dataseed2.ninicoin.io/',
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
    rpcUrls: [`https://forno.celo.org`],
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
    rpcWssUrl: LLAMANODES_API_KEY ? `wss://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}` : undefined,
    rpcUrls: [
      LLAMANODES_API_KEY ? `https://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}` : undefined,
      'https://rpc.ankr.com/eth',
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
    ].filter(isNotNullish),
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
    rpcUrls: ['https://rpc.ftm.tools/', 'https://rpc.ankr.com/fantom', 'https://rpcapi.fantom.network'],
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
    rpcUrls: ['https://rpc.gnosischain.com', 'https://xdai-archive.blockscout.com'],
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
    rpcUrls: [`https://api.harmony.one`, 'https://harmony-0-rpc.gateway.pokt.network', 'https://api.s0.t.hmny.io'],
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
    rpcWssUrl: LLAMANODES_API_KEY ? `wss://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}` : undefined,
    rpcUrls: [
      LLAMANODES_API_KEY ? `https://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}` : undefined,
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.maticvigil.com/',
    ].filter(isNotNullish),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Matic',
      symbol: 'MATIC',
    },
  },
  {
    id: 'moonbeam',
    chainId: 1284,
    name: 'Moonbeam',
    rpcUrls: ['https://rpc.api.moonbeam.network', 'https://rpc.ankr.com/moonbeam'],
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
      OPTIMISM_RPC,
      'https://optimism.publicnode.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op',
      'https://mainnet.optimism.io',
    ].filter(isNotNullish),
    nativeCurrency: {
      address: ADDRESS_ZERO,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  {
    id: 'gnosis',
    chainId: 100,
    name: 'Gnosis Chain',
    rpcUrls: ['https://rpc.gnosischain.com', 'https://xdai-archive.blockscout.com'],
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

export const toDefiLlamaChain: { [key: string]: string } = {
  arbitrum: 'arbitrum',
  'arbitrum-nova': 'arbitrum nova',
  avalanche: 'avax',
  bittorrent: 'bittorrent',
  bsc: 'bsc',
  celo: 'celo',
  ethereum: 'ethereum',
  fantom: 'fantom',
  gnosis: 'xdai',
  moonbeam: 'moonbeam',
  optimism: 'optimism',
  polygon: 'polygon',
}

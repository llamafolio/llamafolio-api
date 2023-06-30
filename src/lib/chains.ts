import environment from '@environment'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Token } from '@lib/token'

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

export const gasToken = {
  ethereum: {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    chain: 'ethereum',
    priceId: 'coingecko:ethereum',
  },
  arbitrum: {
    address: '0x0000000000000000000000000000000000001010',
    name: 'Arbitrum Ether',
    symbol: 'ETH',
    decimals: 18,
    chain: 'arbitrum',
    priceId: 'coingecko:ethereum',
  },
  avalanche: {
    address: '0x0100000000000000000000000000000000000001',
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    chain: 'avalanche',
    priceId: 'coingecko:avalanche-2',
  },
  bsc: {
    address: '0x0100000000000000000000000000000000000001',
    name: 'Binance Coin',
    symbol: 'BNB',
    decimals: 18,
    chain: 'bsc',
    priceId: 'coingecko:binancecoin',
  },
  celo: {
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
    chain: 'celo',
    priceId: 'coingecko:celo',
  },
  fantom: {
    address: '0x0100000000000000000000000000000000000001',
    decimals: 18,
    symbol: 'FTM',
    name: 'Fantom',
    chain: 'fantom',
    priceId: 'coingecko:fantom',
  },
  gnosis: {
    address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    name: 'xDai',
    symbol: 'xDAI',
    decimals: 18,
    chain: 'gnosis',
    priceId: 'coingecko:xdai',
  },
  harmony: {
    address: ADDRESS_ZERO,
    name: 'Harmony',
    symbol: 'ONE',
    decimals: 18,
    chain: 'harmony',
    priceId: 'coingecko:harmony',
  },
  moonbeam: {
    address: '0x0000000000000000000000000000000000000802',
    name: 'GLMR',
    symbol: 'GLMR',
    decimals: 18,
    chain: 'moonbeam',
    priceId: 'coingecko:moonbeam',
  },
  optimism: {
    address: '0x0000000000000000000000000000000000001010',
    decimals: 18,
    symbol: 'ETH',
    name: 'Optimism Ether',
    chain: 'optimism',
    priceId: 'coingecko:ethereum',
  },
  polygon: {
    address: '0x0000000000000000000000000000000000001010',
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    chain: 'polygon',
    priceId: 'coingecko:matic-network',
  },
} satisfies {
  [key in Chain]: Token & { priceId: string }
}

export interface IChainInfo {
  id: Chain
  chainId: number
  name: string
  rpcWssUrl?: string
  rpcUrls: string[]
}

// Currently supported chains
export const chains = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrls: [ARBITRUM_RPC, 'https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'].filter(isNotNullish),
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
  },
  {
    id: 'celo',
    chainId: 42220,
    name: 'Celo',
    rpcUrls: [`https://forno.celo.org`],
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
  },
  {
    id: 'fantom',
    chainId: 250,
    name: 'Fantom',
    rpcUrls: ['https://rpc.ftm.tools/', 'https://rpc.ankr.com/fantom', 'https://rpcapi.fantom.network'],
  },
  {
    id: 'harmony',
    chainId: 1666600000,
    name: 'Harmony',
    rpcUrls: [`https://api.harmony.one`, 'https://harmony-0-rpc.gateway.pokt.network', 'https://api.s0.t.hmny.io'],
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
  },
  {
    id: 'moonbeam',
    chainId: 1284,
    name: 'Moonbeam',
    rpcUrls: ['https://rpc.api.moonbeam.network', 'https://rpc.ankr.com/moonbeam'],
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
  },
  {
    id: 'gnosis',
    chainId: 100,
    name: 'Gnosis Chain',
    rpcUrls: ['https://rpc.gnosischain.com', 'https://xdai-archive.blockscout.com'],
  },
] satisfies IChainInfo[]

export const chainById: { [key: string]: IChainInfo } = {}

for (const chain of chains) {
  chainById[chain.id] = chain
}

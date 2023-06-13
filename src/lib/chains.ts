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

export interface IChainInfo {
  id: Chain
  chainId: number
  name: string
  rpcWssUrl?: string
  rpcUrls: string[]
  gasToken: Address
}

// Currently supported chains
export const chains = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrls: [ARBITRUM_RPC, 'https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'].filter(isNotNullish),
    gasToken: ADDRESS_ZERO,
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
    gasToken: ADDRESS_ZERO,
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
    gasToken: ADDRESS_ZERO,
  },
  {
    id: 'celo',
    chainId: 42220,
    name: 'Celo',
    rpcUrls: [`https://forno.celo.org`],
    gasToken: '0x471EcE3750Da237f93B8E339c536989b8978a438',
  },
  {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    rpcWssUrl: LLAMANODES_API_KEY ? `wss://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}` : undefined,
    rpcUrls: [
      LLAMANODES_API_KEY ? `https://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}` : undefined,
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
      'https://cloudflare-eth.com/',
    ].filter(isNotNullish),
    gasToken: ADDRESS_ZERO,
  },
  {
    id: 'fantom',
    chainId: 250,
    name: 'Fantom',
    rpcUrls: ['https://rpc.ftm.tools/', 'https://rpc.ankr.com/fantom', 'https://rpcapi.fantom.network'],
    gasToken: ADDRESS_ZERO,
  },
  {
    id: 'harmony',
    chainId: 1666600000,
    name: 'Harmony',
    rpcUrls: [`https://api.harmony.one`, 'https://harmony-0-rpc.gateway.pokt.network', 'https://api.s0.t.hmny.io'],
    gasToken: ADDRESS_ZERO,
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
    gasToken: ADDRESS_ZERO,
  },
  {
    id: 'moonbeam',
    chainId: 1284,
    name: 'Moonbeam',
    rpcUrls: ['https://rpc.api.moonbeam.network', 'https://rpc.ankr.com/moonbeam'],
    gasToken: ADDRESS_ZERO,
  },
  {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    rpcUrls: [OPTIMISM_RPC, 'https://mainnet.optimism.io/', 'https://rpc.ankr.com/optimism'].filter(isNotNullish),
    gasToken: ADDRESS_ZERO,
  },
  {
    id: 'gnosis',
    chainId: 100,
    name: 'Gnosis Chain',
    rpcUrls: ['https://rpc.gnosischain.com', 'https://xdai-archive.blockscout.com'],
    gasToken: ADDRESS_ZERO,
  },
] satisfies IChainInfo[]

export const chainById: { [key: string]: IChainInfo } = {}

for (const chain of chains) {
  chainById[chain.id] = chain
}

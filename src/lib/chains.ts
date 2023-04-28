import environment from '@environment'

import { isNotNullish } from './type'

const { LLAMANODES_API_KEY } = environment

export declare type Chain =
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'fantom'
  | 'xdai'
  | 'optimism'
  | 'avax'
  | 'arbitrum'
  | 'celo'
  | 'harmony'

export interface IChainInfo {
  id: Chain
  chainId: number
  name: string
  rpcWssUrl?: string
  rpcUrls: string[]
}

// Currently supported chains
export const chains: IChainInfo[] = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'].filter(isNotNullish),
  },
  {
    id: 'avax',
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
    rpcWssUrl: `wss://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
    rpcUrls: [
      `https://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
      'https://cloudflare-eth.com/',
    ],
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
    rpcWssUrl: `wss://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
    rpcUrls: [
      `https://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.maticvigil.com/',
    ],
  },
  {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    rpcUrls: ['https://mainnet.optimism.io/', 'https://rpc.ankr.com/optimism'].filter(isNotNullish),
  },
  {
    id: 'xdai',
    chainId: 100,
    name: 'Gnosis Chain',
    rpcUrls: ['https://rpc.gnosischain.com', 'https://xdai-archive.blockscout.com'],
  },
]

export const chainById: { [key: string]: IChainInfo } = {}

for (const chain of chains) {
  chainById[chain.id] = chain
}

// Helper to match DefiLlama chains to our keys
export const chainIdResolver: { [key: string]: string } = {
  arbitrum: 'arbitrum',
  avalanche: 'avax',
  bsc: 'bsc',
  celo: 'celo',
  ethereum: 'ethereum',
  fantom: 'fantom',
  optimism: 'optimism',
  polygon: 'polygon',
}

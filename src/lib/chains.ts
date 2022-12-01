import { LLAMANODES_API_KEY } from '../../env'

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
  rpcUrl: string[]
}

// Currently supported chains
export const chains: IChainInfo[] = [
  {
    id: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: [
      // `https://arbitrum-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://arb1.arbitrum.io/rpc',
    ],
  },
  {
    id: 'avax',
    chainId: 43114,
    name: 'Avalanche',
    // TODO: LlamaNodes RPC
    rpcUrl: [`https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc`],
  },
  {
    id: 'bsc',
    chainId: 56,
    name: 'BNB Chain',
    rpcUrl: [
      // `https://bsc-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
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
    // TODO: LlamaNodes RPC
    rpcUrl: [`https://forno.celo.org`],
  },
  {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: [
      `https://eth.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
      'https://cloudflare-eth.com/',
      'https://main-light.eth.linkpool.io/',
      'https://api.mycryptoapi.com/eth',
    ],
  },
  {
    id: 'fantom',
    chainId: 250,
    name: 'Fantom',
    rpcUrl: [
      `https://ftm.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://rpc.ankr.com/fantom',
      'https://rpc.ftm.tools/',
      'https://rpcapi.fantom.network',
    ],
  },
  {
    id: 'harmony',
    chainId: 1666600000,
    name: 'Harmony',
    // TODO: LlamaNodes RPC
    rpcUrl: [
      `https://api.harmony.one`,
      'https://harmony-0-rpc.gateway.pokt.network',
      'https://api.harmony.one',
      'https://api.s0.t.hmny.io',
    ],
  },
  {
    id: 'polygon',
    chainId: 137,
    name: 'Polygon',
    rpcUrl: [
      `https://polygon.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.maticvigil.com/',
    ],
  },
  {
    id: 'optimism',
    chainId: 10,
    name: 'Optimism',
    rpcUrl: [
      // `https://optimism-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://mainnet.optimism.io/',
    ],
  },
  {
    id: 'xdai',
    chainId: 100,
    name: 'Gnosis Chain',
    rpcUrl: [
      // `https://gnosis-ski.llamarpc.com/rpc/${LLAMANODES_API_KEY}`,
      'https://rpc.ankr.com/gnosis',
      'https://xdai-archive.blockscout.com',
    ],
  },
]

export const chainById: { [key: string]: IChainInfo } = {}

for (const chain of chains) {
  chainById[chain.id] = chain
}

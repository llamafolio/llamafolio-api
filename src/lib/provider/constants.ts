import { environment } from '@environment'
import type { Chain as _Chain } from 'viem/chains'
import {
  arbitrum,
  avalanche,
  bsc,
  celo,
  fantom,
  foundry,
  gnosis,
  hardhat,
  harmonyOne,
  localhost,
  mainnet,
  moonbeam,
  optimism,
  polygon,
} from 'viem/chains'

export const chains = {
  mainnet,
  /** patch */
  ethereum: mainnet,
  moonbeam,
  polygon,
  optimism,
  avalanche,
  harmonyOne,
  /** patch */
  harmony: harmonyOne,
  celo,
  gnosis,
  arbitrum,
  bsc,
  fantom,
} as const

export type Network = keyof typeof chains

export const networks = {
  ethereum: {
    ...rpcNetworkInfo('mainnet'),
    http: [
      `https://eth.llamarpc.com/rpc/${environment.LLAMANODES_API_KEY}`,
      `https://rpc.ankr.com/eth/${environment.ANKR_API_KEY}`,
      `https://mainnet.infura.io/v3/${environment.INFURA_API_KEY}`,
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
      `https://eth-mainnet.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`,
      `https://cloudflare-eth.com`,
    ],
    ws: [
      `wss://eth.llamarpc.com/rpc/${environment.LLAMANODES_API_KEY}`,
      `wss://rpc-ws.ankr.com/${environment.ANKR_API_KEY}`,
      `wss://eth-mainnet.ws.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`,
      `wss://mainnet.infura.io/ws/v3/${environment.INFURA_API_KEY}`,
    ],
  },

  mainnet: {
    ...rpcNetworkInfo('mainnet'),
    http: [
      `https://eth.llamarpc.com/rpc/${environment.LLAMANODES_API_KEY}`,
      `https://rpc.ankr.com/eth/${environment.ANKR_API_KEY}`,
      `https://eth-mainnet.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`,
      `https://mainnet.infura.io/v3/${environment.INFURA_API_KEY}`,
      'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
      `https://cloudflare-eth.com`,
    ],
    ws: [
      `wss://eth.llamarpc.com/rpc/${environment.LLAMANODES_API_KEY}`,
      `wss://rpc-ws.ankr.com/${environment.ANKR_API_KEY}`,
      `wss://eth-mainnet.ws.alchemyapi.io/v2/${environment.ALCHEMY_API_KEY}`,
      `wss://mainnet.infura.io/ws/v3/${environment.INFURA_API_KEY}`,
    ],
  },

  polygon: {
    ...rpcNetworkInfo('polygon'),
    http: [
      `https://polygon.llamarpc.com/rpc/${environment.LLAMANODES_API_KEY}`,
      `https://rpc.ankr.com/polygon/${environment.ANKR_API_KEY}`,
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.maticvigil.com/',
    ],
    ws: [
      `wss://polygon.llamarpc.com/rpc/${environment.LLAMANODES_API_KEY}`,
      `wss://rpc-ws.ankr.com/polygon/${environment.ANKR_API_KEY}`,
    ],
  },
  arbitrum: {
    ...rpcNetworkInfo('arbitrum'),
    http: [
      `https://endpoints.omniatech.io/v1/arbitrum/one/public`,
      `https://rpc.ankr.com/arbitrum/${environment.ANKR_API_KEY}`,
      'https://arb1.arbitrum.io/rpc',
    ],
    ws: [`wss://rpc-ws.ankr.com/arbitrum/${environment.ANKR_API_KEY}`],
  },
  avalanche: {
    ...rpcNetworkInfo('avalanche'),
    http: [
      'https://avalanche.public-rpc.com',
      'https://api.avax.network/ext/bc/C/rpc',
      'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc',
    ],
    ws: [`wss://ava-mainnet.public.blastapi.io/ext/bc/C/ws`, `wss://api.avax.network/ext/bc/C/ws`],
  },
  optimism: {
    ...rpcNetworkInfo('optimism'),
    http: ['https://mainnet.optimism.io/', `https://rpc.ankr.com/optimism/${environment.ANKR_API_KEY}`],
    ws: ['wss://mainnet.optimism.io/'],
  },
  moonbeam: {
    ...rpcNetworkInfo('moonbeam'),
    http: ['https://rpc.api.moonbeam.network', `https://rpc.ankr.com/moonbeam/${environment.ANKR_API_KEY}`],
    ws: ['wss://wss.rpc.api.moonbeam.network'],
  },
  bsc: {
    ...rpcNetworkInfo('bsc'),
    http: [
      `https://bsc.publicnode.com`,
      `https://bsc-dataseed1.ninicoin.io`,
      `https://rpc.ankr.com/bsc/${environment.ANKR_API_KEY}`,
    ],
    ws: [`https://bsc.publicnode.com`, `https://bsc-dataseed1.ninicoin.io`],
  },
  celo: {
    ...rpcNetworkInfo('celo'),
    http: [`https://forno.celo.org`, `https://rpc.ankr.com/celo/${environment.ANKR_API_KEY}`],
    ws: [`wss://forno.celo.org/ws`],
  },
  fantom: {
    ...rpcNetworkInfo('fantom'),
    http: [`https://rpc.ftm.tools`, `https://rpc.ankr.com/fantom/${environment.ANKR_API_KEY}`],
    ws: [`wss://wsapi.fantom.network/`, `wss://fantom-mainnet.public.blastapi.io/`],
  },
  gnosis: {
    ...rpcNetworkInfo('gnosis'),
    http: [
      'https://rpc.gnosischain.com',
      'https://xdai-archive.blockscout.com',
      `https://gnosischain-rpc.gateway.pokt.network`,
      `https://rpc.ankr.com/gnosis/${environment.ANKR_API_KEY}`,
      `https://gnosis.blockpi.network/v1/rpc/public`,
    ],
    ws: [`wss://rpc.gnosischain.com/wss`],
  },
  harmony: {
    ...rpcNetworkInfo('harmony'),
    http: [
      `https://api.harmony.one`,
      `https://rpc.ankr.com/harmony/${environment.ANKR_API_KEY}`,
      'https://harmony-0-rpc.gateway.pokt.network',
      'https://api.s0.t.hmny.io',
    ],
    ws: [],
  },
  harmonyOne: {
    ...rpcNetworkInfo('harmonyOne'),
    http: [
      `https://api.harmony.one`,
      `https://rpc.ankr.com/harmony/${environment.ANKR_API_KEY}`,
      'https://harmony-0-rpc.gateway.pokt.network',
      'https://api.s0.t.hmny.io',
    ],
    ws: [],
  },
} satisfies Record<Network, ReturnType<typeof rpcNetworkInfo> & { http: Array<string>; ws?: Array<string> }>

export const testnetChains = {
  foundry,
  hardhat,
  localhost,
} as const

export type TestnetNetwork = keyof typeof testnetChains

export const testnetNetworks = {
  localhost: {
    ...localhost,
    http: ['http://localhost:8545'],
    ws: ['ws://localhost:8545'],
  },
  foundry: {
    ...foundry,
    http: ['http://localhost:8545'],
    ws: ['ws://localhost:8545'],
  },
  hardhat: {
    ...hardhat,
    http: ['http://localhost:8545'],
    ws: ['ws://localhost:8545'],
  },
} satisfies Record<TestnetNetwork, ReturnType<typeof rpcNetworkInfo> & { http: Array<string>; ws?: Array<string> }>

// remove `rpcUrls` from `Chain` type
function rpcNetworkInfo(network: Network): Omit<_Chain, 'rpcUrls'> {
  const { rpcUrls: _, ...chain } = chains[network]
  return chain
}

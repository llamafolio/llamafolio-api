import { ADDRESS_ZERO } from '@lib/contract'
import type { Address, HttpTransportConfig, PublicClient } from 'viem'
import { createPublicClient, fallback, http } from 'viem'
import * as viemChains from 'viem/chains'

/**
 * Supported chains
 */
export type Chain =
  | 'arbitrum'
  | 'arbitrum-nova'
  | 'avalanche'
  | 'bsc'
  | 'base'
  | 'celo'
  | 'ethereum'
  | 'fantom'
  | 'gnosis'
  | 'harmony'
  | 'linea'
  | 'moonbeam'
  | 'opbnb'
  | 'optimism'
  | 'polygon'
  | 'polygon-zkevm'
  | 'zksync-era'
  | 'linea'

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
  'polygon-zkevm': 'polygonzkevm',
  'zksync-era': 'zksync',
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

/**
 * @param address ex: 'base:0x000', '0x000'
 */
export const parseDefiLlamaChainAddress = (address?: string) => {
  const parts = (address || '').split(':')

  if (parts.length === 1) {
    return { address: parts[0]?.toLowerCase(), chain: 'ethereum' }
  }

  const chainId = getChainId(parts[0].toLowerCase())
  if (chainId != null) {
    return { address: parts[1]?.toLowerCase(), chain: chainByChainId[chainId].id }
  }

  return { address: parts[1]?.toLowerCase(), chain: undefined }
}

export function getChainId(chain: string) {
  return (chainById[chain] || chainById[fromDefiLlamaChain[chain]] || chainByChainId[chain as unknown as number])
    ?.chainId
}

interface RPCClientOptions {
  chain: Chain
  httpTransportConfig?: HttpTransportConfig
  batchConfig?: {
    multicall?: boolean | { wait?: number; batchSize?: number } | undefined
  }
}

export function getRPCClient(options: RPCClientOptions): PublicClient {
  const httpTransportConfig = options.httpTransportConfig || { batch: { batchSize: 1000, wait: 10 } }
  const batch = options.batchConfig || { multicall: { wait: 10, batchSize: 1000 } }

  switch (options.chain) {
    case 'arbitrum':
      return createPublicClient({
        chain: viemChains.arbitrum,
        transport: fallback([
          http('https://rpc.ankr.com/arbitrum', httpTransportConfig),
          http('https://arb1.arbitrum.io/rpc', httpTransportConfig),
        ]),
        batch,
      })

    case 'arbitrum-nova':
      return createPublicClient({
        chain: viemChains.arbitrumNova,
        transport: fallback([http('https://nova.arbitrum.io/rpc', httpTransportConfig)]),
      })

    case 'avalanche':
      return createPublicClient({
        chain: viemChains.avalanche,
        transport: fallback([
          http('https://rpc.ankr.com/avalanche', httpTransportConfig),
          http('https://avalanche.public-rpc.com', httpTransportConfig),
          http('https://api.avax.network/ext/bc/C/rpc', httpTransportConfig),
          http('https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc', httpTransportConfig),
        ]),
        batch,
      })

    case 'base':
      return createPublicClient({
        chain: viemChains.base,
        transport: fallback([
          http('https://base-rpc.publicnode.com', httpTransportConfig),
          http('https://base-pokt.nodies.app', httpTransportConfig),
          http('https://base.drpc.org', httpTransportConfig),
          http('https://base-mainnet.public.blastapi.io', httpTransportConfig),
          http('https://mainnet.base.org', httpTransportConfig),
        ]),
        batch,
      })

    case 'bsc':
      return createPublicClient({
        chain: viemChains.bsc,
        transport: fallback([
          http('https://bsc-dataseed.binance.org/', httpTransportConfig),
          http('https://bsc-dataseed1.ninicoin.io/', httpTransportConfig),
        ]),
      })

    case 'celo':
      return createPublicClient({
        chain: viemChains.celo,
        transport: fallback([
          http('https://rpc.ankr.com/celo', httpTransportConfig),
          http('https://forno.celo.org', httpTransportConfig),
        ]),
        batch,
      })

    case 'ethereum':
      return createPublicClient({
        chain: viemChains.mainnet,
        transport: fallback([
          http('https://rpc.mevblocker.io', httpTransportConfig),
          http('https://eth-pokt.nodies.app', httpTransportConfig),
          http('https://ethereum-rpc.publicnode.com', httpTransportConfig),
          http('https://rpc.ankr.com/eth', httpTransportConfig),
          http('https://cloudflare-eth.com', httpTransportConfig),
        ]),
        batch,
      })

    case 'fantom':
      return createPublicClient({
        chain: viemChains.fantom,
        transport: fallback([
          http('https://rpc.ankr.com/fantom', httpTransportConfig),
          http('https://rpc.ftm.tools/', httpTransportConfig),
          http('https://rpcapi.fantom.network', httpTransportConfig),
        ]),
        batch,
      })

    case 'gnosis':
      return createPublicClient({
        chain: viemChains.gnosis,
        transport: fallback([
          http('https://rpc.ankr.com/gnosis', httpTransportConfig),
          http('https://rpc.gnosischain.com', httpTransportConfig),
          http('https://xdai-archive.blockscout.com', httpTransportConfig),
        ]),
      })

    case 'harmony':
      return createPublicClient({
        chain: viemChains.harmonyOne,
        transport: fallback([
          http('https://rpc.ankr.com/harmony', httpTransportConfig),
          http(`https://api.harmony.one`, httpTransportConfig),
          http('https://harmony-0-rpc.gateway.pokt.network', httpTransportConfig),
          http('https://api.s0.t.hmny.io', httpTransportConfig),
        ]),
        batch,
      })

    case 'linea':
      return createPublicClient({
        chain: viemChains.linea,
        transport: fallback([
          http('https://linea.blockpi.network/v1/rpc/public', httpTransportConfig),
          http('https://rpc.linea.build', httpTransportConfig),
          http('https://1rpc.io/linea', httpTransportConfig),
        ]),
        batch,
      })

    case 'moonbeam':
      return createPublicClient({
        chain: viemChains.moonbeam,
        transport: fallback([
          http('https://rpc.ankr.com/moonbeam', httpTransportConfig),
          http('https://rpc.api.moonbeam.network', httpTransportConfig),
          http('https://rpc.ankr.com/moonbeam', httpTransportConfig),
        ]),
        batch,
      })

    case 'opbnb':
      return createPublicClient({
        chain: viemChains.opBNB,
        transport: fallback([
          http('https://opbnb.publicnode.com', httpTransportConfig),
          http('https://opbnb-mainnet-rpc.bnbchain.org', httpTransportConfig),
        ]),
        batch,
      })

    case 'optimism':
      return createPublicClient({
        chain: viemChains.optimism,
        transport: fallback([
          http('https://rpc.ankr.com/optimism', httpTransportConfig),
          http('https://mainnet.optimism.io', httpTransportConfig),
        ]),
        batch,
      })

    case 'polygon':
      return createPublicClient({
        chain: viemChains.polygon,
        transport: fallback([
          http('https://rpc.ankr.com/polygon', httpTransportConfig),
          http('https://polygon-rpc.com/', httpTransportConfig),
          http('https://rpc-mainnet.maticvigil.com/', httpTransportConfig),
        ]),
        batch,
      })

    case 'polygon-zkevm':
      return createPublicClient({
        chain: viemChains.polygonZkEvm,
        transport: fallback([
          http('https://zkevm-rpc.com', httpTransportConfig),
          http('https://rpc.ankr.com/polygon_zkevm', httpTransportConfig),
        ]),
        batch,
      })

    case 'zksync-era':
      return createPublicClient({
        chain: viemChains.zkSync,
        transport: fallback([
          http('https://mainnet.era.zksync.io', httpTransportConfig),
          http('https://zksync-era.blockpi.network/v1/rpc/public', httpTransportConfig),
          http('https://zksync.drpc.org', httpTransportConfig),
        ]),
        batch,
      })
  }
}

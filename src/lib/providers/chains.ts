import type { Chain } from '@lib/chains'
import type { Chain as _Chain } from 'viem/chains'
import {
  arbitrum,
  avalanche,
  bsc,
  celo,
  fantom,
  harmonyOne as harmony,
  mainnet as ethereum,
  moonbeam,
  optimism,
  polygon,
} from 'viem/chains'

const gnosis = {
  id: 100,
  name: 'Gnosis',
  network: 'gnosis',
  nativeCurrency: {
    decimals: 18,
    name: 'Gnosis',
    symbol: 'xDAI',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.gnosischain.com'],
    },
    public: {
      http: ['https://rpc.gnosischain.com'],
    },
  },
  blockExplorers: {
    etherscan: {
      name: 'Gnosisscan',
      url: 'https://gnosisscan.io/',
    },
    default: {
      name: 'Gnosis Chain Explorer',
      url: 'https://blockscout.com/xdai/mainnet/',
    },
  },
  // NOTE: multicall3 address missing in viem config
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 21022491,
    },
  },
} as const

export const viemChainById: { [key in Chain]: _Chain } = {
  arbitrum,
  avalanche,
  bsc,
  celo,
  ethereum,
  fantom,
  gnosis,
  harmony,
  moonbeam,
  optimism,
  polygon,
} as const

import type { Chain } from '@lib/chains'
import type { Chain as _Chain } from 'viem/chains'
import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  celo,
  fantom,
  gnosis,
  harmonyOne as harmony,
  mainnet as ethereum,
  moonbeam,
  optimism,
  polygon,
  polygonZkEvm,
  zkSync,
} from 'viem/chains'

export const viemChainById: { [key in Chain]: _Chain } = {
  arbitrum,
  'arbitrum-nova': arbitrumNova,
  avalanche,
  bsc,
  base,
  celo,
  ethereum,
  fantom,
  gnosis,
  harmony,
  moonbeam,
  optimism,
  polygon,
  'polygon-zkevm': polygonZkEvm,
  'zksync-era': zkSync,
} as const

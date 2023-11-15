import type { Chain } from '@lib/chains'

export const coingeckoPlatformToChain: { [key: string]: Chain } = {
  'arbitrum-one': 'arbitrum',
  'arbitrum-nova': 'arbitrum-nova',
  avalanche: 'avalanche',
  base: 'base',
  'binance-smart-chain': 'bsc',
  celo: 'celo',
  ethereum: 'ethereum',
  fantom: 'fantom',
  'harmony-shard-0': 'harmony',
  linea: 'linea',
  moonbeam: 'moonbeam',
  'polygon-pos': 'polygon',
  'polygon-zkevm': 'polygon-zkevm',
  opbnb: 'opbnb',
  'optimistic-ethereum': 'optimism',
  xdai: 'gnosis',
  zksync: 'zksync-era',
}

export interface CoingeckoCoin {
  id: string
  symbol: string
  name: string
  // chain-address mapping
  platforms: { [key: string]: string }
  mcap: number
}

export async function fetchCoingeckoCoins(): Promise<CoingeckoCoin[]> {
  const res = await fetch('https://defillama-datasets.llama.fi/tokenlist/cgFull.json')
  return res.json()
}

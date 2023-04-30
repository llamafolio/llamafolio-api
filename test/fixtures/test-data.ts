import { type Chain } from '@lib/chains'

export const testAddresses = ['0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50']

export const testTokens: { [chain in Chain]: string[] } = {
  ethereum: [
    '0x6b175474e89094c44da98b954eedeac495271d0f',
    '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  ],
  polygon: [],
  optimism: [],
  arbitrum: [],
  bsc: [],
  fantom: [],
  xdai: [],
  avax: [],
  celo: [],
  harmony: [],
}

const chains = [
  'ethereum',
  'polygon',
  'bsc',
  'fantom',
  'xdai',
  'arbitrum',
  'avax',
  'harmony',
  'xdai',
  'optimism',
] satisfies ReadonlyArray<Chain>

/**
 * Hardcoded for now
 * TODO: make this dynamic
 */
export const testData = {
  address: testAddresses[0],
  chain: chains[0],
  token: testTokens['ethereum'][0],
} as const

export type TestData = typeof testData

import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getRookStakeBalances } from './stake'

const stakers: Contract[] = [
  { chain: 'ethereum', address: '0x4f868c1aa37fcf307ab38d215382e88fca6275e2' },
  { chain: 'ethereum', address: '0x35ffd6e268610e764ff6944d07760d0efe5e40e5' },
]

const tokensLists: Contract[] = [
  { chain: 'ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, symbol: 'ETH' },
  { chain: 'ethereum', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18, symbol: 'WETH' },
  { chain: 'ethereum', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, symbol: 'DAI' },
  { chain: 'ethereum', address: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d', decimals: 18, symbol: 'RENBTC' },
  { chain: 'ethereum', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 18, symbol: 'USDC' },
  { chain: 'ethereum', address: '0xfa5047c9c78b8877af97bdcb85db743fd7313d4a', decimals: 18, symbol: 'ROOK' },
]

export const getContracts = () => {
  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: (...args) => getRookStakeBalances(...args, tokensLists),
  })

  return {
    groups: [{ balances }],
  }
}

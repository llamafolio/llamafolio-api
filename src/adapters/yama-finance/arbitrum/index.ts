import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'
import type { Token } from '@lib/token'

const USDT: Token = {
  chain: 'arbitrum',
  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  decimals: 6,
  symbol: 'USDT',
}

const USDT_YL: Contract = {
  chain: 'arbitrum',
  address: '0x3296EE4Fa62D0D78B1999617886E969a22653383',
  underlyings: [USDT],
}

export const getContracts = async () => {
  return {
    contracts: { assets: [USDT_YL] },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: getSingleStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

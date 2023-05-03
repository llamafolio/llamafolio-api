import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'

import { getDepositBalances, getDepositMarkets } from './deposit'

const DYDX: Contract = {
  name: 'DYDX',
  address: '0x92d6c1e31e14520e676a687f0a93788b716beff5',
  chain: 'ethereum',
  symbol: 'DYDX',
  decimals: 18,
  coingeckoId: 'dydx',
  wallet: true,
  stable: false,
}

const USDC: Contract = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  symbol: 'USDC',
}

// dYdX Governance
const stkDYDX: Contract = {
  chain: 'ethereum',
  address: '0x65f7BA4Ec257AF7c55fd5854E5f6356bBd0fb8EC',
  symbol: 'stkDYDX',
  decimals: 18,
  category: 'stake',
  underlyings: [DYDX],
}

const stkUSDC: Contract = {
  chain: 'ethereum',
  address: '0x5aa653a076c1dbb47cec8c1b4d152444cad91941',
  symbol: 'stkUSDC',
  decimals: 6,
  category: 'stake',
  underlyings: [USDC],
}

const dydxSoloMargin: Contract = {
  chain: 'ethereum',
  address: '0x1e0447b19bb6ecfdae1e4ae1694b0c3659614e4e',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getDepositMarkets(ctx, dydxSoloMargin)

  return {
    contracts: { stakers: [stkDYDX, stkUSDC], markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getSingleStakeBalances,
    markets: (...args) => getDepositBalances(...args, dydxSoloMargin),
  })

  return {
    groups: [{ balances }],
  }
}

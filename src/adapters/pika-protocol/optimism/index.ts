import type { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getPerpetualsBalances, getStakeBalances } from './balance'

const USDC: Token = {
  chain: 'optimism',
  address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
  decimals: 6,
  symbol: 'USDC',
}

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

const pikaPerpV3: Contract = {
  chain: 'optimism',
  address: '0xD5A8f233CBdDb40368D55C3320644Fb36e597002',
  underlyings: [USDC],
  rewarder: ['0x939c11c596B851447e5220584d37F12854bA02ae', '0x78136ef4bdcbdabb8d7aa09a33c3c16ca6381910'],
  rewards: [USDC, OP],
}

export const getContracts = async () => {
  return {
    contracts: { pikaPerpV3 },
    revalidate: 60 * 60,
  }
}

const getPikaBalances = async (ctx: BalancesContext, contract: Contract) => {
  const [stakeBalances, perpetualBalances] = await Promise.all([
    getStakeBalances(ctx, contract),
    getPerpetualsBalances(ctx, contract),
  ])

  return [stakeBalances, ...perpetualBalances]
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pikaPerpV3: getPikaBalances,
  })

  return {
    groups: [{ balances }],
  }
}

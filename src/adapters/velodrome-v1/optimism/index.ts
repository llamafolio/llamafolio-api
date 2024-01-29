import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

import { getVelodromeBalances } from './balance'
import { getVelodromePairsContracts } from './pair'

const VELO: Token = {
  chain: 'optimism',
  address: '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05',
  decimals: 18,
  symbol: 'VELO',
}

const factory: Contract = {
  chain: 'optimism',
  address: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746',
}

const voter: Contract = {
  chain: 'optimism',
  address: '0x09236cfF45047DBee6B921e00704bed6D6B8Cf7e',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0x9c7305eb78a432ced5c4d14cac27e8ed569a2e26',
}

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getVelodromePairsContracts(ctx, factory, voter)

  return {
    contracts: { pairs, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getVelodromeBalances,
    locker: (...args) => getNFTLockerBalances(...args, VELO, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1654128000,
}

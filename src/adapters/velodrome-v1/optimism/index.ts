import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVelodromeBalances } from './balance'
import { getVelodromePairsContracts } from './pair'

const factory: Contract = {
  chain: 'optimism',
  address: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746',
}

const voter: Contract = {
  chain: 'optimism',
  address: '0x09236cfF45047DBee6B921e00704bed6D6B8Cf7e',
}

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getVelodromePairsContracts(ctx, factory, voter)

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getVelodromeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

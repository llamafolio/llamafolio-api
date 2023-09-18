import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVelodromeBalances } from './balance'
import { getVelodromePairsContracts } from './pair'

const factory: Contract = {
  chain: 'optimism',
  address: '0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a',
}

const voter: Contract = {
  chain: 'optimism',
  address: '0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C',
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

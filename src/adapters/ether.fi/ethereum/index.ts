import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getEtherBalances } from './stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x7623e9dc0da6ff821ddb9ebaba794054e078f8c4',
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getEtherBalances,
  })

  return {
    groups: [{ balances }],
  }
}

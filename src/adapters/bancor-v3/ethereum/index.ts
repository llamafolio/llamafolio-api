import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances, getPoolsContracts, getProgramsContracts, getStakeBalances } from './pools'

const standardRewards: Contract = {
  chain: 'ethereum',
  address: '0xb0B958398ABB0b5DB4ce4d7598Fb868f5A00f372',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, programs] = await Promise.all([getPoolsContracts(ctx), getProgramsContracts(ctx)])

  return {
    contracts: { pools, standardRewards },
    props: { programs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts, { programs }) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPoolsBalances,
    standardRewards: (ctx, standardRewards) => getStakeBalances(ctx, standardRewards, programs),
  })

  return {
    groups: [{ balances }],
  }
}

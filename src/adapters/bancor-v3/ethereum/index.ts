import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances, getPoolsContracts, getStakeBalances, getStandardRewardsContract } from './pools'

export const getContracts = async (ctx: BaseContext) => {
  const [pools, standardRewards] = await Promise.all([getPoolsContracts(ctx), getStandardRewardsContract(ctx)])

  return {
    contracts: { pools, standardRewards },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPoolsBalances,
    standardRewards: getStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

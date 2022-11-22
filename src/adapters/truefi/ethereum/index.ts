import { GetBalancesHandler } from '@lib/adapter'

import { getFarmBalances } from './farm'
import { getPoolsContracts, getPoolsSupplies } from './pools'
import { getStakeBalances } from './stake'

export const getContracts = async () => {
  const pools = await getPoolsContracts('ethereum')

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const poolsSupplies = await getPoolsSupplies('ethereum', pools || [])

  const [farmBalances, stakeBalances] = await Promise.all([
    getFarmBalances(ctx, 'ethereum', poolsSupplies),
    getStakeBalances(ctx, 'ethereum', poolsSupplies),
  ])

  return {
    balances: [...farmBalances, ...stakeBalances],
  }
}

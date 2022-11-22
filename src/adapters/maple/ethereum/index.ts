import { GetBalancesHandler } from '@lib/adapter'

import { getStakeBalances } from './balances'
import { getContractsFromGraph } from './contracts'

export const getContracts = async () => {
  const pools = await getContractsFromGraph()

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const balances = await getStakeBalances(ctx, 'ethereum', pools || [])

  return {
    balances,
  }
}

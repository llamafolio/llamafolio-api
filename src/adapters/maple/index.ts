import { Adapter, GetBalancesHandler } from '@lib/adapter'

import { getStakeBalances } from './balances'
import { getContractsFromGraph } from './contracts'

const getContracts = async () => {
  const pools = await getContractsFromGraph()

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const balances = await getStakeBalances(ctx, 'ethereum', pools || [])

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'maple',
  getContracts,
  getBalances,
}

export default adapter

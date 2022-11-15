import { Adapter, GetBalancesHandler } from '@lib/adapter'

import { getStakeBalances } from './balances'
import { getContractsFromGraph } from './contracts'

const getContracts = async () => {
  return {
    contracts: await getContractsFromGraph(),
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await getStakeBalances(ctx, 'ethereum', contracts)

  return {
    balances: balances,
  }
}

const adapter: Adapter = {
  id: 'maple',
  getContracts,
  getBalances,
}

export default adapter

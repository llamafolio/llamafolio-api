import { Adapter, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

import { getPoolsBalances } from './balances'
import { getPoolsContracts } from './contracts'

const spoolController: Contract = {
  name: 'spoolController',
  displayName: 'Spool Controller',
  chain: 'ethereum',
  address: '0xdd4051c3571c143b989c3227e8eb50983974835c',
}

const getContracts = async () => {
  return {
    contracts: await getPoolsContracts(spoolController),
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts: Contract[]) => {
  const balances = await getPoolsBalances(ctx, 'ethereum', contracts)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'spool-protocol',
  getContracts,
  getBalances,
}

export default adapter

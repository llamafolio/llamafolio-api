import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from './balances'
import { getPoolsContracts } from './contracts'

const spoolController: Contract = {
  name: 'spoolController',
  displayName: 'Spool Controller',
  chain: 'ethereum',
  address: '0xdd4051c3571c143b989c3227e8eb50983974835c',
}

export const getContracts = async () => {
  const pools = await getPoolsContracts(spoolController)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    pools: getPoolsBalances,
  })

  return {
    balances,
  }
}

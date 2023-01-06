import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getIFOPoolsBalances, getIFOPoolsContracts } from './ifo'

const concentratorIFOVault: Contract = {
  name: 'ConcentratorIFO',
  displayName: 'Concentrator IFO',
  chain: 'ethereum',
  address: '0x3cf54f3a1969be9916dad548f3c084331c4450b5',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getIFOPoolsContracts(ctx, concentratorIFOVault)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getIFOPoolsBalances(ctx, pools, concentratorIFOVault),
  })

  return { balances }
}

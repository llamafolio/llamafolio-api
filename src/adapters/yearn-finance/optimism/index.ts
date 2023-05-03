import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVaultsBalances, getVaultsContracts } from '../common/vaults'

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'optimism',
  address: '0xBcfCA75fF12E2C1bB404c2C216DBF901BE047690',
}

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getVaultsContracts(ctx, registryAdapter)

  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: (...args) => getVaultsBalances(...args, registryAdapter),
  })

  return {
    groups: [{ balances }],
  }
}

import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVaultsBalances, getVaultsContracts } from '../common/vaults'

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'fantom',
  address: '0xF628Fb7436fFC382e2af8E63DD7ccbaa142E3cd1',
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

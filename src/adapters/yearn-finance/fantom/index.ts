import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPositionsBalances, getPositionsContract } from '../common/yield'

const RegistryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'fantom',
  address: '0xF628Fb7436fFC382e2af8E63DD7ccbaa142E3cd1',
}

export const getContracts = async (ctx: BaseContext) => {
  const assetsPositions = await getPositionsContract(ctx, RegistryAdapter)

  return {
    contracts: { RegistryAdapter, assetsPositions },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assetsPositions: (...args) => getPositionsBalances(...args, RegistryAdapter),
  })

  return {
    balances,
  }
}

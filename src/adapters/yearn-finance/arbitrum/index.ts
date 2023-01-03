import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPositionsBalances, getPositionsContract } from '../common/yield'

const RegistryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'arbitrum',
  address: '0x57AA88A0810dfe3f9b71a9b179Dd8bF5F956C46A',
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

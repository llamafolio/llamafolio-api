import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVaultsBalances, getVaultsContracts } from '../common/vaults'

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'arbitrum',
  address: '0x57AA88A0810dfe3f9b71a9b179Dd8bF5F956C46A',
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

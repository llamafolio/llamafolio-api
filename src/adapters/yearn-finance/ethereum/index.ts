import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVaultsBalances, getVaultsContracts } from '../common/vaults'

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'ethereum',
  address: '0x240315db938d44bb124ae619f5Fd0269A02d1271',
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
    balances,
  }
}

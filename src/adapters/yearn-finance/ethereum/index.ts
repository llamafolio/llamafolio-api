import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPositionsBalances, getPositionsContract } from '../common/yield'

const RegistryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'ethereum',
  address: '0x240315db938d44bb124ae619f5Fd0269A02d1271',
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

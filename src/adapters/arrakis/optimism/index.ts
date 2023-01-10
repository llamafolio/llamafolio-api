import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLpBalances } from '../common/balances'
import { getVaults } from '../common/contracts'

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'optimism',
  address: '0x2845c6929d621e32B7596520C8a1E5a37e616F09',
}

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getVaults(ctx, factoryArrakis)

  return {
    contracts: { vaults },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getLpBalances,
  })

  return {
    balances,
  }
}

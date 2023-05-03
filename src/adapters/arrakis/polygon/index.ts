import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLpBalances } from '../common/balances'
import { getVaults } from '../common/contracts'

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'polygon',
  address: '0x37265A834e95D11c36527451c7844eF346dC342a',
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
    groups: [{ balances }],
  }
}

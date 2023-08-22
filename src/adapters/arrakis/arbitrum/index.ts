import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getArrakisFarmBalances, getLpBalances } from '../common/balances'
import { getFarmersContracts, getVaults } from '../common/contracts'

const farmers: `0x${string}`[] = ['0xc78f036f557925270e3506e140cfe5f2a188c3a3']

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'arbitrum',
  address: '0xd68b055fb444D136e3aC4df023f4C42334F06395',
}

export const getContracts = async (ctx: BaseContext) => {
  const [vaults, pools] = await Promise.all([getVaults(ctx, factoryArrakis), getFarmersContracts(ctx, farmers)])

  return {
    contracts: { vaults, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getLpBalances,
    pools: getArrakisFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getArrakisFarmBalances, getLpBalances } from '../common/balances'
import { getFarmersContracts, getVaults } from '../common/contracts'

const farmers: `0x${string}`[] = [
  '0x52c0faaf48bc8de603d7ef50d4e2e48e8bf59311',
  '0xc78f036f557925270e3506e140cfe5f2a188c3a3',
  '0x4ace4b3eb96bd7b3136ab7e14f070717a8137be8',
]

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'ethereum',
  address: '0xEA1aFf9dbFfD1580F6b81A3ad3589E66652dB7D9',
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

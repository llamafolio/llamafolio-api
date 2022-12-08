import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLpBalances } from '../common/balances'
import { getVaults } from '../common/contracts'

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'ethereum',
  address: '0xEA1aFf9dbFfD1580F6b81A3ad3589E66652dB7D9',
}

export const getContracts = async () => {
  const vaults = await getVaults('ethereum', factoryArrakis)

  return {
    contracts: { vaults },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    vaults: getLpBalances,
  })

  return {
    balances,
  }
}

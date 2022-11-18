import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'

import { getLpBalances } from './balances'
import { getVaults } from './contracts'

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'ethereum',
  address: '0xEA1aFf9dbFfD1580F6b81A3ad3589E66652dB7D9',
}

const getContracts = async () => {
  const vaults = await getVaults(factoryArrakis)

  return {
    contracts: { vaults },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { vaults }) => {
  const balances = await getLpBalances(ctx, 'ethereum', vaults || [])

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'arrakis-finance',
  getContracts,
  getBalances,
}

export default adapter

import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'

import { getStakeBalances } from './balances'

const glpStaker: Contract = {
  name: 'sGLP',
  displayName: 'GLP Staker',
  chain: 'arbitrum',
  address: '0x1addd80e6039594ee970e5872d247bf0414c8903',
}

const gmxStaker: Contract = {
  name: 'sGMX',
  displayName: 'GMX Staker',
  chain: 'arbitrum',
  address: '0x908c4d94d34924765f1edc22a1dd098397c59dd4',
}

const getContracts = async () => {
  return {
    contracts: [glpStaker, gmxStaker],
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await getStakeBalances(ctx, 'arbitrum', contracts)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'gmx',
  getContracts,
  getBalances,
}

export default adapter

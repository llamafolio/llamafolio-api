import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTrustLockBalances } from './lock'

const locker: Contract = {
  chain: 'ethereum',
  address: '0x56968bb1168b0e9314dca1eb3d1e7aaf0d32263e',
  token: '0xCC4304A31d09258b0029eA7FE63d032f52e44EFe',
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getTrustLockBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1658275200,
}

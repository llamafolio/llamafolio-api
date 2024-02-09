import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTrustLockBalances } from '../common/lock'

const locker: Contract = {
  chain: 'avalanche',
  address: '0x56968bb1168b0e9314dca1eb3d1e7aaf0d32263e',
  token: '0xc7B5D72C836e718cDA8888eaf03707fAef675079',
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

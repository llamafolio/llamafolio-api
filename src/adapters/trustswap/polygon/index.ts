import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTrustLockBalances } from '../common/lock'

const locker: Contract = {
  chain: 'polygon',
  address: '0x56968bb1168b0e9314dca1eb3d1e7aaf0d32263e',
  token: '0x3809dcDd5dDe24B37AbE64A5a339784c3323c44F',
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

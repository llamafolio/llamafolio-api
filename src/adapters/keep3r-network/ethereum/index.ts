import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getKeeperLockerBalances } from './locker'

const locker: Contract = {
  chain: 'ethereum',
  address: '0x2fc52c61fb0c03489649311989ce2689d93dc1a2',
  decimals: 18,
  symbol: 'vKP3R',
  underlyings: ['0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44'],
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getKeeperLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

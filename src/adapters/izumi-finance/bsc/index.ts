import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getIzumiBSCBalances } from './balance'

const liquidityManager: Contract = {
  chain: 'bsc',
  address: '0x93c22fbeff4448f2fb6e432579b0638838ff9581',
}

export const getContracts = () => {
  return {
    contracts: { liquidityManager },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    liquidityManager: getIzumiBSCBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

import { getPositions } from './markets'

const market: Contract = {
  name: 'eulerMarkets',
  displayName: 'Markets Euler',
  chain: 'ethereum',
  address: '0x3520d5a913427E6F0D6A83E07ccD4A4da316e4d3',
}

export const getContracts = () => {
  return {
    contracts: { market },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, { market }) => {
  const balances = await getPositions(ctx, 'ethereum', market)

  return {
    balances,
  }
}

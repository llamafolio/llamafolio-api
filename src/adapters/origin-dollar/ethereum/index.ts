import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getOriginDollarLockerBalances } from './locker'
import { getOriginDollarStakerBalances } from './stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xd2af830e8cbdfed6cc11bab697bb25496ed6fa62',
  underlyings: ['0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86'],
  symbol: 'WOUSD',
  decimals: 18,
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x0c4576ca1c365868e162554af8e385dc3e7c66d9',
  underlyings: ['0x9c354503C38481a7A7a51629142963F98eCC12D0'],
}

export const getContracts = () => {
  return {
    contracts: { staker, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getOriginDollarStakerBalances,
    locker: getOriginDollarLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getLockerBalances } from '../common/locker'

const vtxLocker: Contract = {
  name: 'vectorLocker',
  displayName: 'VTX Locker',
  chain: 'avax',
  address: '0x574679Ec54972cf6d705E0a71467Bb5BB362919D',
}

export const getContracts = () => {
  return {
    contracts: { vtxLocker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { vtxLocker }) => {
  const balances = await getLockerBalances(ctx, 'avax', [vtxLocker])

  return {
    balances,
  }
}

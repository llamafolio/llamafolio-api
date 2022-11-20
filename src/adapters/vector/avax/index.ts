import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getFarmContracts } from '../common/farm'
import { getLockerBalances } from '../common/locker'

const vtxLocker: Contract = {
  name: 'vectorLocker',
  displayName: 'VTX Locker',
  chain: 'avax',
  address: '0x574679Ec54972cf6d705E0a71467Bb5BB362919D',
}

const masterChef: Contract = {
  name: 'Vector MasterChef',
  chain: 'avax',
  address: '0x423D0FE33031aA4456a17b150804aA57fc157d97',
}

export const getContracts = async () => {
  const farm = await getFarmContracts('avax', masterChef)
  console.log(farm)

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

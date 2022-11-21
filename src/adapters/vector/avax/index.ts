import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFarmBalances, getFarmContracts } from '../common/farm'

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
  const farmContracts = await getFarmContracts('avax', masterChef)

  return {
    contracts: { vtxLocker, farmContracts, masterChef },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = resolveBalances(ctx, 'avax', contracts, { farmContracts, masterChef: getFarmBalances })
  // const farmBalances = await getFarmBalances(ctx, 'avax', farmContracts || [], masterChef)
  // const balances = await getLockerBalances(ctx, 'avax', [vtxLocker])

  return {
    balances,
  }
}

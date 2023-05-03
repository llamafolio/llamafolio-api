import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFarmBalances, getFarmContracts } from './farm'
import { getLockerBalances } from './locker'

const vtxLocker: Contract = {
  name: 'Locked VTX',
  displayName: 'VTX Locker',
  chain: 'avalanche',
  address: '0xf99264cbf9652824b3412fa21e8cbeb69c3ea0a7',
  decimals: 18,
  symbol: 'LVTXv2',
}

const masterChef: Contract = {
  name: 'Vector MasterChef',
  chain: 'avalanche',
  address: '0x423D0FE33031aA4456a17b150804aA57fc157d97',
}

export const getContracts = async (ctx: BaseContext) => {
  const farmContracts = await getFarmContracts(ctx, masterChef)

  return {
    contracts: { vtxLocker, farmContracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmContracts: (...args) => getFarmBalances(...args, masterChef),
    vtxLocker: getLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

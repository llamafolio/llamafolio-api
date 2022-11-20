import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLockerBalances } from '../common/balances'

const vtxLocker: Contract = {
  name: 'vectorLocker',
  displayName: 'VTX Locker',
  chain: 'avax',
  address: '0x574679Ec54972cf6d705E0a71467Bb5BB362919D',
}

export const getContracts = () => {
  return {
    contracts: { vtxLocker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'avax', contracts, { vtxLocker: getLockerBalances })

  return {
    balances,
  }
}

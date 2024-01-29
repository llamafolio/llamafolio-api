import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from './balances'

const NMS: Contract = {
  name: 'Nemesis DAO',
  chain: 'bsc',
  address: '0x8AC9DC3358A2dB19fDd57f433ff45d1fc357aFb3',
  decimals: 9,
  symbol: 'NMS',
}

const sNMS: Contract = {
  name: 'Staked Nemesis',
  chain: 'bsc',
  address: '0xb91bfdb8b41120586ccb391f5cee0dae4482334f',
  decimals: 9,
  symbol: 'sNMS ',
  underlyings: [NMS],
}

export const getContracts = async () => {
  return {
    contracts: { sNMS },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sNMS: getStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1636761600,
}

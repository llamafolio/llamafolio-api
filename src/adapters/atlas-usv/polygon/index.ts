import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getStakeBalance } from '../common/stake'
import { getVestingBalances } from './vest'

const USV: Token = {
  chain: 'polygon',
  address: '0xac63686230f64bdeaf086fe6764085453ab3023f',
  symbol: 'USV',
  decimals: 9,
}

const sUSV: Contract = {
  name: 'Staked Universal Store of Value',
  chain: 'polygon',
  address: '0x01D119e2F0441eA442e3ab84e0dBbf04bd993556',
  symbol: 'sUSV',
  decimals: 9,
  underlyings: [USV],
}

const vesters: Contract[] = [
  {
    chain: 'polygon',
    address: '0x8cbcaacf6d5e13f17b71ad98f6910d5656ac3c8f',
  },
  {
    chain: 'polygon',
    address: '0x96eadc4ffabbfa6b2fc30dd98f527009e167214b',
  },
  {
    chain: 'polygon',
    address: '0x95199ff1acf40e04bb9d04b21a87154fbaafb9ee',
  },
  {
    chain: 'polygon',
    address: '0x20a1dc647f26ca38ed19a7e66c7eef621cc75b0e',
  },
]

export const getContracts = () => {
  return {
    contracts: { sUSV, vesters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sUSV: getStakeBalance,
    vesters: getVestingBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1639353600,
}

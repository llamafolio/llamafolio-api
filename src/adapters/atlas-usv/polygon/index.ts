import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStakeBalance } from '../common/stake'

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

export const getContracts = () => {
  return {
    contracts: { sUSV },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sUSV: getStakeBalance,
  })

  return {
    balances,
  }
}

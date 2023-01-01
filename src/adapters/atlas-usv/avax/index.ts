import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStakeBalance } from '../common/stake'

const USV: Token = {
  chain: 'avax',
  address: '0xb0a8E082E5f8d2a04e74372c1bE47737d85A0E73',
  symbol: 'USV',
  decimals: 9,
}

const sUSV: Contract = {
  name: 'Staked Universal Store of Value',
  chain: 'avax',
  address: '0x4022227eBaDa365AeC96FC89E89316E0696C770D',
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

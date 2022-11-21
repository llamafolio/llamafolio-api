import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFormattedStakeBalances, getStakeBalances } from '../common/stake'

const sOHM: Contract = {
  name: 'Staked OHM',
  chain: 'ethereum',
  address: '0x04906695D6D12CF5459975d7C3C03356E4Ccd460',
  symbol: 'sOHM',
  decimals: 9,
}

const gOHM: Contract = {
  name: 'Governance OHM',
  chain: 'ethereum',
  address: '0x0ab87046fBb341D058F17CBC4c1133F25a20a52f',
  symbol: 'gOHM',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { sOHM, gOHM },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    sOHM: getStakeBalances,
    gOHM: getFormattedStakeBalances,
  })

  return {
    balances,
  }
}

import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBondsBalances, getBondsContracts } from '../common/bond'
import { getFormattedStakeBalances, getStakeBalances } from '../common/stake'

const sOHM_deprecated: Contract = {
  chain: 'ethereum',
  address: '0x04f2694c8fcee23e8fd0dfea1d4f5bb8c352111f',
  symbol: 'sOHM',
  decimals: 9,
}

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

const bondOHM: Contract = {
  name: 'OlympusPro Factory Storage',
  chain: 'ethereum',
  address: '0x6828D71014D797533C3b49B6990Ca1781656B71f',
}

export const getContracts = async (ctx: BaseContext) => {
  const bonds = await getBondsContracts(ctx, bondOHM)
  const stakers = [sOHM, sOHM_deprecated]

  return {
    contracts: { stakers, gOHM, bondOHM, bonds },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getStakeBalances,
    gOHM: getFormattedStakeBalances,
    bonds: getBondsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

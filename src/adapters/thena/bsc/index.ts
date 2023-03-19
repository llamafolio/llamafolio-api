// https://thena.gitbook.io/thena/

import { getGaugesBalances } from '@adapters/velodrome/optimism/gauge'
import { getVotingEscrowBalances } from '@adapters/velodrome/optimism/votingEscrow'
import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getPairsContracts } from './pair'

const the: Contract = {
  chain: 'bsc',
  address: '0xf4c8e32eadec4bfe97e0f595add0f4450a863a11',
  name: 'Thena',
  symbol: 'THE',
  decimals: 18,
  coingeckoId: 'thena',
  stable: false,
}

const votingEscrow: Contract = {
  chain: 'bsc',
  address: '0xfBBF371C9B0B994EebFcC977CEf603F7f31c070D',
}

export const getContracts = async (ctx: BaseContext) => {
  const { pairs, gauges } = await getPairsContracts(ctx)

  return {
    contracts: { pairs, gauges, votingEscrow },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    gauges: getGaugesBalances,
    votingEscrow: (ctx, votingEscrow) => getVotingEscrowBalances(ctx, votingEscrow, the),
  })

  return {
    groups: [{ balances }],
  }
}

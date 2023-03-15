// https://docs.velodrome.finance/

import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getGaugesBalances } from './gauge'
import { getPairsContracts } from './pair'
import { getVotingEscrowBalances } from './votingEscrow'

const velo: Contract = {
  chain: 'optimism',
  address: '0x3c8b650257cfb5f272f799f5e2b4e65093a11a05',
  name: 'Velodrome Finance',
  symbol: 'VELO',
  decimals: 18,
  coingeckoId: 'velodrome-finance',
  wallet: true,
  stable: false,
}

const votingEscrow: Contract = {
  chain: 'optimism',
  address: '0x9c7305eb78a432ced5C4D14Cac27E8Ed569A2e26',
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
    votingEscrow: (ctx, votingEscrow) => getVotingEscrowBalances(ctx, votingEscrow, velo),
  })

  return {
    groups: [{ balances }],
  }
}

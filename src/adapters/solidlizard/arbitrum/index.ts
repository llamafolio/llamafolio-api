// https://solidlizard.gitbook.io/solidlizard/security/contracts

import { getGaugesBalances } from '@adapters/velodrome/optimism/gauge'
import { getVotingEscrowBalances } from '@adapters/velodrome/optimism/votingEscrow'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getPairsContracts } from './pair'

const sliz: Contract = {
  chain: 'arbitrum',
  address: '0x463913d3a3d3d291667d53b8325c598eb88d3b0e',
  name: 'SolidLizard',
  symbol: 'SLIZ',
  decimals: 18,
  coingeckoId: 'solidlizard',
  stable: false,
}

const votingEscrow: Contract = {
  chain: 'arbitrum',
  address: '0x29d3622c78615A1E7459e4bE434d816b7de293e4',
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
    votingEscrow: (ctx, votingEscrow) => getVotingEscrowBalances(ctx, votingEscrow, sliz),
  })

  return {
    groups: [{ balances }],
  }
}

// https://docs.solidly.com/resources/contract-addresses

import { getGaugesBalances } from '@adapters/velodrome/optimism/gauge'
import { getVotingEscrowBalances } from '@adapters/velodrome/optimism/votingEscrow'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getLensContracts } from './lens'

const solid: Contract = {
  chain: 'ethereum',
  address: '0x777172d858dc1599914a1c4c6c9fc48c99a60990',
  name: 'Solidly',
  symbol: 'SOLID',
  decimals: 18,
  coingeckoId: 'solidlydex',
  stable: false,
}

const votingEscrow: Contract = {
  chain: 'ethereum',
  address: '0x77730ed992d286c53f3a0838232c3957daeaaf73',
}

const lens: Contract = {
  chain: 'ethereum',
  address: '0x7778D2091E3c97a259367c2cfc621cF839Bbbe2c',
}

export const getContracts = async (ctx: BaseContext) => {
  const { pairs, gauges } = await getLensContracts(ctx, lens)

  return {
    contracts: { pairs, gauges, votingEscrow },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    gauges: getGaugesBalances,
    votingEscrow: (ctx, votingEscrow) => getVotingEscrowBalances(ctx, votingEscrow, solid),
  })

  return {
    groups: [{ balances }],
  }
}

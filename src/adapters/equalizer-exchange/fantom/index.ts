// https://equalizer0x.gitbook.io/equalizer-exchange-docs/guides/deployed-contract-addresses

import { getGaugesBalances } from '@adapters/velodrome/optimism/gauge'
import { getVotingEscrowBalances } from '@adapters/velodrome/optimism/votingEscrow'
import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getPairsContracts } from './pair'

const equal: Contract = {
  chain: 'fantom',
  address: '0x3fd3a0c85b70754efc07ac9ac0cbbdce664865a6',
  name: 'Equalizer DEX',
  symbol: 'EQUAL',
  decimals: 18,
  coingeckoId: 'equalizer-dex',
  stable: false,
}

const votingEscrow: Contract = {
  chain: 'fantom',
  address: '0x8313f3551C4D3984FfbaDFb42f780D0c8763Ce94',
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
    votingEscrow: (ctx, votingEscrow) => getVotingEscrowBalances(ctx, votingEscrow, equal),
  })

  return {
    groups: [{ balances }],
  }
}

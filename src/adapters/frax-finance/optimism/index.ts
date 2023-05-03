import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const pools: Contract[] = [
  { chain: 'optimism', address: '0xcc4dd8bc7967d46060ba3faaa8e525a35625f8b4' },
  { chain: 'optimism', address: '0x9456c020d3a05b159dab4557535083fba836c49a' },
]

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsDetails(ctx, pools)

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

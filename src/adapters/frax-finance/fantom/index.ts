import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const pools: Contract[] = [
  { chain: 'fantom', address: '0x4ac3de029f4c11ab40a51336f7229d67cd1e92a5' },
  { chain: 'fantom', address: '0x173f3e43f0414f903620948f9d2094f9dbd92f15' },
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

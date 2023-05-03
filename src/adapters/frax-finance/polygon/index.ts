import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const pools: Contract[] = [
  { chain: 'polygon', address: '0x1b238bdb3ae538fc8201aa1475bffc216e3b374f' },
  { chain: 'polygon', address: '0x60ac6d228ffeeeff423879baa02091558e6480dc' },
  { chain: 'polygon', address: '0x4f7267af6db7b284df74bea9e35402987d8c72a7' },
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

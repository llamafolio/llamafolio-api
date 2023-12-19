import { getLocusFarmBalances } from '@adapters/locus-finance/common/balance'
import { getLocusPools } from '@adapters/locus-finance/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolsAddresses: `0x${string}`[] = [
  '0x0e86f93145d097090acbbb8ee44c716dacff04d7',
  '0x65b08ffa1c0e1679228936c0c85180871789e1d7',
  '0xf62a24ebe766d0da04c9e2aeecd5e86fac049b7b',
  '0x3edbe670d03c4a71367deda78e73ea4f8d68f2e4',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLocusPools(ctx, poolsAddresses)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getLocusFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

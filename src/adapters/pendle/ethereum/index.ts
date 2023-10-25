import { getPendleBalances } from '@adapters/pendle/common/balance'
import { getPendlePools } from '@adapters/pendle/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPendlePools(ctx)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPendleBalances,
  })

  return {
    groups: [{ balances }],
  }
}

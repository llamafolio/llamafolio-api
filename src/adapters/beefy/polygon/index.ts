import { getBeefyBalances } from '@adapters/beefy/common/balance'
import { getBeefyPools } from '@adapters/beefy/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBeefyPools(ctx)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getBeefyBalances,
  })

  return {
    groups: [{ balances }],
  }
}

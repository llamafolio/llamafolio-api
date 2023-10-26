import { getHopFarmBalances, getHopLpBalances } from '@adapters/hop-protocol/common/balance'
import { getHopPools } from '@adapters/hop-protocol/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const { pools, farmers } = await getHopPools(ctx)

  return {
    contracts: { pools, farmers },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getHopLpBalances,
    farmers: getHopFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

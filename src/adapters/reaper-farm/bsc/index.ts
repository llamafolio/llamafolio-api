import { getReaperFarmBalances } from '@adapters/reaper-farm/common/balance'
import { getReaperPools } from '@adapters/reaper-farm/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getReaperPools(ctx)

  console.log(pools)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getReaperFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import { getBeefyFarmBalances } from '@adapters/beefy/common/balance'
import { getBoostBeefyBalances } from '@adapters/beefy/common/boost'
import { getBeefyPools } from '@adapters/beefy/common/pool'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBeefyPools(ctx)

  return {
    contracts: { pools },
  }
}

async function getBeefyBalances(ctx: BalancesContext, pools: Contract[]) {
  return Promise.all([getBeefyFarmBalances(ctx, pools), getBoostBeefyBalances(ctx, pools)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getBeefyBalances,
  })

  return {
    groups: [{ balances }],
  }
}

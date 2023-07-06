import { getStakeDaoContractsFromAPIs } from '@adapters/stakedao/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getStakeDaoContractsFromAPIs(ctx, ['curve', 'balancer', 'angle'])

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {})

  return {
    groups: [{ balances }],
  }
}

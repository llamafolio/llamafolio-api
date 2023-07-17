import { getTetuLpBalances } from '@adapters/tetu/common/lp'
import { getTetuPools } from '@adapters/tetu/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const URL = 'https://api.thegraph.com/subgraphs/name/tetu-io/tetu-swap'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getTetuPools(ctx, URL)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getTetuLpBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'

import { getBalancerPools } from '../common/pool'
import { getOldBalancerPools } from './pool'

const oldUrl = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer'
const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

export const getContracts = async (ctx: BaseContext) => {
  const oldPools = await getOldBalancerPools(ctx, oldUrl)
  const pools = await getBalancerPools(ctx, url)

  return {
    contracts: { oldPools, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    oldPools: (ctx, oldPools) => getPoolsBalances(ctx, oldPools, { getPoolAddress: (pool) => pool.address }),
  })

  return {
    balances,
  }
}

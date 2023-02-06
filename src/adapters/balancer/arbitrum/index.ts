import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBalancerPools } from '../common/pool'

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBalancerPools(ctx, url)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {})

  return {
    balances,
  }
}

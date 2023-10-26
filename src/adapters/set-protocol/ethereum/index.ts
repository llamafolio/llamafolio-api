import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'

import { getSetProtocolPools } from './contract'

const controller: Contract = {
  chain: 'ethereum',
  address: '0xa4c8d221d8BB851f83aadd0223a8900A6921A349',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSetProtocolPools(ctx, controller)

  return {
    contracts: { pools, controller },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getPoolsBalances(ctx, pools, { getPoolAddress: (pool) => pool.address }),
  })

  return {
    groups: [{ balances }],
  }
}

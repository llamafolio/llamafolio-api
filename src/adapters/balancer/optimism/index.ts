import { getBalancerBalances } from '@adapters/balancer/common/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBalancerPools } from '../common/pool'

const vault: Contract = {
  chain: 'optimism',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-optimism-v2'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBalancerPools(ctx, url)

  return {
    contracts: { pools, vault },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBalancerBalances(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

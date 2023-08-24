import { getBalancesBalances } from '@adapters/balancer/common/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBalancerPools } from '../common/pool'

const vault: Contract = {
  chain: 'polygon',
  address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
}

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBalancerPools(ctx, url)

  return {
    contracts: { pools, vault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBalancesBalances(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

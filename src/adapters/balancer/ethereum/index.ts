import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'

import { getBalancerPoolsBalances } from '../common/balance'
import { getBalancerPools } from '../common/pool'
import { getOldBalancerPools } from './pool'

const gaugeInfos: Contract = {
  chain: 'ethereum',
  address: '0x2fFB7B215Ae7F088eC2530C7aa8E1B24E398f26a',
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const oldUrl = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer'
const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

export const getContracts = async (ctx: BaseContext) => {
  const oldPools = await getOldBalancerPools(ctx, oldUrl)
  const pools = await getBalancerPools(ctx, url, gaugeInfos)

  return {
    contracts: { oldPools, pools, gaugeInfos, vault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    oldPools: (ctx, oldPools) => getPoolsBalances(ctx, oldPools, { getPoolAddress: (pool) => pool.address }),
    pools: (...args) => getBalancerPoolsBalances(...args, vault),
  })

  return {
    balances,
  }
}

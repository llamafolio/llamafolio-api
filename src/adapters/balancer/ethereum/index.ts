import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'

import { getOldBalancerPools } from './pool'

const gaugeController: Contract = {
  chain: 'ethereum',
  address: '0x4E7bBd911cf1EFa442BC1b2e9Ea01ffE785412EC',
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const oldUrl = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer'
const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

export const getContracts = async (ctx: BaseContext) => {
  const oldPools = await getOldBalancerPools(ctx, oldUrl)

  return {
    contracts: { oldPools },
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

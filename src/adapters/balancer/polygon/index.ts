import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBalancerPoolsBalances, getLpBalancerPoolsBalances } from '../common/balance'
import { getBalancerPools } from '../common/pool'

const gaugeController: Contract = {
  chain: 'polygon',
  address: '0x3b8cA519122CdD8efb272b0D3085453404B25bD0',
}

const vault: Contract = {
  chain: 'polygon',
  address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
}

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBalancerPools(ctx, url, gaugeController)

  return {
    contracts: { pools, gaugeController, vault },
  }
}

const getBalancerBalances = async (ctx: BalancesContext, pools: Contract[], vault: Contract) => {
  return Promise.all([getBalancerPoolsBalances(ctx, pools, vault), getLpBalancerPoolsBalances(ctx, pools, vault)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBalancerBalances(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

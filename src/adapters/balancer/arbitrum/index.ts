import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBalancerPoolsBalances } from '../common/balance'
import { getBalancerPools } from '../common/pool'

const gaugeController: Contract = {
  chain: 'arbitrum',
  address: '0xb08E16cFc07C684dAA2f93C70323BAdb2A6CBFd2',
}

const vault: Contract = {
  chain: 'arbitrum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const url = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBalancerPools(ctx, url, gaugeController)

  return {
    contracts: { pools, gaugeController, vault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBalancerPoolsBalances(...args, vault),
  })

  console.log(balances[0].underlyings)

  return {
    balances,
  }
}

import { getBalancerPoolsBalances } from '@adapters/balancer/common/balance'
import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getAuraPools } from './pool'

const booster: Contract = {
  chain: 'ethereum',
  address: '0xA57b8d98dAE62B26Ec3bcC4a365338157060B234',
}

const vaultBAL: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getAuraPools(ctx, booster, vaultBAL)

  return {
    contracts: { booster, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBalancerPoolsBalances(...args, vaultBAL),
  })

  return {
    balances,
  }
}

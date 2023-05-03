import { getLendingRewardsBalances } from '@adapters/aave-v2/common/rewards'
import { getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getSturdyBalances } from './balance'
import { getSturdyContracts } from './contract'

const strdy: Token = {
  chain: 'ethereum',
  address: '0x59276455177429ae2af1cc62B77AE31B34EC3890',
  decimals: 18,
  symbol: 'STRDY',
}

const lendingPool: Contract = {
  name: 'Lending Pool',
  address: '0xA422CA380bd70EeF876292839222159E41AAEe17',
  chain: 'ethereum',
}

const lendingPool_old: Contract = {
  name: 'Lending Pool',
  address: '0x9f72dc67cec672bb99e3d02cbea0a21536a2b657',
  chain: 'ethereum',
}

const incentiveController: Contract = {
  name: 'Incentive Controller',
  address: '0xA3e9B5e1dc6B24F296FfCF9c085E2546A466b883',
  chain: 'ethereum',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSturdyContracts(ctx, [lendingPool, lendingPool_old])

  return {
    contracts: { pools, incentiveController },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getSturdyBalances,
    incentiveController: (...args) => getLendingRewardsBalances(...args, strdy, contracts.pools || []),
  })

  const healthFactor = await getLendingPoolHealthFactor(ctx, lendingPool)

  return {
    groups: [{ balances, healthFactor }],
  }
}

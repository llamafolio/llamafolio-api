import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendingRewardsBalances } from '../common/rewards'

const lendingPool: Contract = {
  name: 'Lending Pool',
  address: '0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c',
  chain: 'avalanche',
}

const WAVAX: Contract = {
  chain: 'avalanche',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  name: 'Wrapped AVAX',
  symbol: 'WAVAX',
  decimals: 18,
  coingeckoId: 'wrapped-avax',
}

const incentiveController: Contract = {
  name: 'Aave Incentive Controller',
  address: '0x01d83fe6a10d2f2b7af17034343746188272cac9',
  chain: 'avalanche',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool)

  return {
    contracts: {
      pools,
      incentiveController,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getLendingPoolBalances,
    incentiveController: (...args) => getLendingRewardsBalances(...args, WAVAX, contracts.pools || []),
  })

  const healthFactor = await getLendingPoolHealthFactor(ctx, lendingPool)

  return {
    groups: [{ balances, healthFactor }],
  }
}

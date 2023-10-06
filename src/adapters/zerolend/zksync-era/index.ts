import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '@adapters/aave-v3/common/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  name: 'Lending Pool',
  address: '0x4d9429246ea989c9cee203b43f6d1c7d83e3b8f8',
  chain: 'zksync-era',
}

const poolDataProvider: Contract = {
  chain: 'zksync-era',
  address: '0xb73550bc1393207960a385fc8b34790e5133175e',
  name: 'Pool Data Provider',
}

const incentiveController: Contract = {
  chain: 'zksync-era',
  address: '0x86bd524c09508df7b4b9027464975351b1bc2c92',
  name: 'Incentive Controller',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool, poolDataProvider)

  incentiveController.pools = pools

  return {
    contracts: {
      pools,
      incentiveController,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getLendingPoolBalances,
      incentiveController: getLendingRewardsBalances,
    }),
    getLendingPoolHealthFactor(ctx, lendingPool),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

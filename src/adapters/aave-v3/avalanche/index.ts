import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '../common/lending'

const lendingPool: Contract = {
  chain: 'avalanche',
  address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  name: 'Pool',
  displayName: 'Pool',
}

const poolDataProvider: Contract = {
  chain: 'avalanche',
  address: '0x69fa688f1dc47d4b5d8029d5a35fb7a548310654',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

const incentiveController: Contract = {
  chain: 'avalanche',
  address: '0x929EC64c34a17401F460460D4B9390518E5B473e',
  name: 'Incentive Controller',
  displayName: 'Aave: Incentives V3',
  pools: [],
  rewards: ['0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'],
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

import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '../common/lending'

const lendingPool: Contract = {
  name: 'Pool',
  displayName: 'Pool',
  chain: 'base',
  address: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
}

const poolDataProvider: Contract = {
  chain: 'base',
  address: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

const incentiveController: Contract = {
  chain: 'base',
  address: '0xf9cc4F0D883F1a1eb2c253bdb46c254Ca51E1F44',
  name: 'Incentive Controller',
  displayName: 'Aave: Incentives V3',
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

export const config: AdapterConfig = {
  startDate: 1692748800,
}

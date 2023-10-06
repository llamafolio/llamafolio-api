import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '@adapters/aave-v3/common/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  name: 'L2Pool',
  address: '0x8f44fd754285aa6a2b8b9b97739b79746e0475a7',
  chain: 'base',
}

const poolDataProvider: Contract = {
  chain: 'base',
  address: '0x2a0979257105834789bc6b9e1b00446dfba8dfba',
  name: 'Pool Data Provider',
}

const incentiveController: Contract = {
  chain: 'base',
  address: '0x91ac2fff8cbef5859eaa6dda661febd533cd3780',
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

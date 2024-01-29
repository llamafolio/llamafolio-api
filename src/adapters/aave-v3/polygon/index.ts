import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '../common/lending'

const lendingPool: Contract = {
  chain: 'polygon',
  address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  name: 'Pool',
  displayName: 'Pool',
}

const poolDataProvider: Contract = {
  chain: 'polygon',
  address: '0x69fa688f1dc47d4b5d8029d5a35fb7a548310654',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

const incentiveController: Contract = {
  chain: 'polygon',
  address: '0x929EC64c34a17401F460460D4B9390518E5B473e',
  name: 'Incentive Controller',
  displayName: 'Aave: Incentives V3',
  pools: [],
  rewards: [
    '0x1d734A02eF1e1f5886e66b0673b71Af5B53ffA94',
    '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756',
    '0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4',
    '0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6',
  ],
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
                    startDate: 1647216000,
                  }
                  
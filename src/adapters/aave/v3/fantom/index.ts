import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '@adapters/aave/v3/common/lending'
import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'fantom',
  address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  name: 'Pool',
  displayName: 'Pool',
}

const poolDataProvider: Contract = {
  chain: 'fantom',
  address: '0x69fa688f1dc47d4b5d8029d5a35fb7a548310654',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

const incentiveController: Contract = {
  chain: 'fantom',
  address: '0x929EC64c34a17401F460460D4B9390518E5B473e',
  name: 'Incentive Controller',
  displayName: 'Aave: Incentives V3',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool, poolDataProvider)

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
    incentiveController: (...args) => getLendingRewardsBalances(...args, contracts.pools || []),
  })

  const healthFactor = await getLendingPoolHealthFactor(ctx, lendingPool)

  return {
    balances,
    healthFactor,
  }
}

import {
  getLendingPoolBalances,
  getLendingPoolContracts,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from '@adapters/aave/v3/common/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'

const lendingPool: Contract = {
  name: 'Pool',
  displayName: 'Pool',
  chain: 'arbitrum',
  address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
}

const poolDataProvider: Contract = {
  chain: 'arbitrum',
  address: '0x69fa688f1dc47d4b5d8029d5a35fb7a548310654',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

const incentiveController: Contract = {
  chain: 'arbitrum',
  address: '0x929EC64c34a17401F460460D4B9390518E5B473e',
  name: 'Incentive Controller',
  displayName: 'Aave: Incentives V3',
}

export const getContracts = async () => {
  const poolsArbitrum = await getLendingPoolContracts('arbitrum', lendingPool, poolDataProvider)

  return {
    contracts: {
      poolsArbitrum,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { poolsArbitrum }) => {
  const [lendingPoolBalances, rewardsPoolBalances, healthFactor] = await Promise.all([
    getLendingPoolBalances(ctx, 'arbitrum', poolsArbitrum || []),
    getLendingRewardsBalances(ctx, 'arbitrum', incentiveController, poolsArbitrum || []),
    getLendingPoolHealthFactor(ctx, 'arbitrum', lendingPool),
  ])

  return {
    balances: [...lendingPoolBalances, ...rewardsPoolBalances],
    arbitrum: {
      healthFactor,
    },
  }
}

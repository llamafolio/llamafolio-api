import { getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/geist/lending'
import { getMultiFeeDistributionBalances, getMultiFeeDistributionContracts } from '@lib/geist/stake'
import type { Token } from '@lib/token'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'Geist Lending',
  chain: 'fantom',
  address: '0x9fad24f572045c7869117160a571b2e50b10d068',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'Geist Locker',
  chain: 'fantom',
  address: '0x49c93a95dbcc9a6a4d8f77e59c038ce5020e82f8',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'Geist incentives controller',
  chain: 'fantom',
  address: '0x297fddc5c33ef988dd03bd13e162ae084ea1fe57',
}

const geistToken: Token = {
  chain: 'fantom',
  address: '0xd8321aa83fb0a4ecd6348d4577431310a6e0814d',
  symbol: 'GEIST',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, fmtMultiFeeDistributionContracts] = await Promise.all([
    getLendingPoolContracts(ctx, lendingPoolContract, chefIncentivesControllerContract, geistToken),
    getMultiFeeDistributionContracts(ctx, multiFeeDistributionContract, geistToken),
  ])

  return {
    contracts: { pools, fmtMultiFeeDistributionContracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: (...args) => getLendingPoolBalances(...args, chefIncentivesControllerContract),
      fmtMultiFeeDistributionContracts: (...args) =>
        getMultiFeeDistributionBalances(...args, {
          multiFeeDistribution: multiFeeDistributionContract,
          lendingPool: lendingPoolContract,
          stakingToken: geistToken,
        }),
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

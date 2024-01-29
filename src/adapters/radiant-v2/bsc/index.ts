import { getLendingPoolBalances } from '@adapters/radiant-v2/arbitrum/lendingPool'
import { getMultiFeeDistributionContracts } from '@adapters/radiant-v2/arbitrum/multifee'
import { getMultiFeeDistributionBalancesBSC } from '@adapters/radiant-v2/bsc/multifee'
import {
  getLendingPoolContracts as getAaveLendingPoolContracts,
  getLendingPoolHealthFactor,
} from '@lib/aave/v2/lending'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'Radiant Lending',
  chain: 'bsc',
  address: '0xd50Cf00b6e600Dd036Ba8eF475677d816d6c4281',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'Radiant multiFeeDistribution',
  chain: 'bsc',
  address: '0x4FD9F7C5ca0829A656561486baDA018505dfcB5E',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'Radiant incentives controller',
  chain: 'bsc',
  address: '0x7C16aBb090d3FB266E9d17F60174B632f4229933',
}

const radiantToken: Token = {
  chain: 'bsc',
  address: '0xf7DE7E8A6bd59ED41a4b5fe50278b3B7f31384dF',
  symbol: 'RDNT',
  decimals: 18,
}

const WBNB_RDNT: Contract = {
  chain: 'bsc',
  address: '0x346575fc7f07e6994d76199e41d13dc1575322e1',
  underlyings: ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', '0xf7de7e8a6bd59ed41a4b5fe50278b3b7f31384df'],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, fmtMultifeeDistributionContract] = await Promise.all([
    getAaveLendingPoolContracts(ctx, lendingPoolContract),
    getMultiFeeDistributionContracts(ctx, multiFeeDistributionContract, WBNB_RDNT),
  ])

  return {
    contracts: { pools, fmtMultifeeDistributionContract },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: (...args) => getLendingPoolBalances(...args, chefIncentivesControllerContract, radiantToken),
      fmtMultifeeDistributionContract: (...args) =>
        getMultiFeeDistributionBalancesBSC(...args, {
          multiFeeDistribution: multiFeeDistributionContract,
          lendingPool: lendingPoolContract,
          stakingToken: WBNB_RDNT,
        }),
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

export const config: AdapterConfig = {
  startDate: 1680048000,
}

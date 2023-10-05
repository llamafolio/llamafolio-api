import {
  getLendingPoolContracts as getAaveLendingPoolContracts,
  getLendingPoolHealthFactor,
} from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getLendingPoolBalances } from './lendingPool'
import { getMultiFeeDistributionBalances, getMultiFeeDistributionContracts } from './multifee'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'Radiant Lending',
  chain: 'arbitrum',
  address: '0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'Radiant multiFeeDistribution',
  chain: 'arbitrum',
  address: '0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'Radiant incentives controller',
  chain: 'arbitrum',
  address: '0xebC85d44cefb1293707b11f707bd3CEc34B4D5fA',
}

const radiantToken: Token = {
  chain: 'arbitrum',
  address: '0x3082CC23568eA640225c2467653dB90e9250AaA0',
  symbol: 'RDNT',
  decimals: 18,
}

const RDNT_WETH: Contract = {
  chain: 'arbitrum',
  address: '0x32df62dc3aed2cd6224193052ce665dc18165841',
  vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
  poolId: '0x32df62dc3aed2cd6224193052ce665dc181658410002000000000000000003bd',
  underlyings: ['0x3082CC23568eA640225c2467653dB90e9250AaA0', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, fmtMultifeeDistributionContract] = await Promise.all([
    getAaveLendingPoolContracts(ctx, lendingPoolContract),
    getMultiFeeDistributionContracts(ctx, multiFeeDistributionContract, RDNT_WETH),
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
        getMultiFeeDistributionBalances(...args, {
          multiFeeDistribution: multiFeeDistributionContract,
          lendingPool: lendingPoolContract,
          stakingToken: RDNT_WETH,
        }),
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

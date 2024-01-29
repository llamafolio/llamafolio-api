import { getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/geist/lending'
import { getMultiFeeDistributionContracts } from '@lib/geist/stake'
import type { Token } from '@lib/token'

import { getUWUMultiFeeDistributionBalances } from './multifee'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'UwU Lending',
  chain: 'ethereum',
  address: '0x2409aF0251DCB89EE3Dee572629291f9B087c668',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution v2',
  displayName: 'UwU Locker',
  chain: 'ethereum',
  address: '0x0a7B2A21027F92243C5e5E777aa30BB7969b0188',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'UwU incentives controller',
  chain: 'ethereum',
  address: '0x21953192664867e19F85E96E1D1Dd79dc31cCcdB',
}

const UwU: Token = {
  chain: 'ethereum',
  address: '0x55C08ca52497e2f1534B59E2917BF524D4765257',
  decimals: 18,
  symbol: 'UwU',
}

const UWU_WETH: Contract = {
  chain: 'ethereum',
  address: '0x3E04863DBa602713Bb5d0edbf7DB7C3A9A2B6027',
  underlyings: [
    { chain: 'ethereum', address: '0x55C08ca52497e2f1534B59E2917BF524D4765257', symbol: 'UWU', decimals: 18 },
    { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
  ],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, fmtMultiFeeDistributionContracts] = await Promise.all([
    getLendingPoolContracts(ctx, lendingPoolContract, chefIncentivesControllerContract, UwU),
    getMultiFeeDistributionContracts(ctx, multiFeeDistributionContract, UWU_WETH),
  ])

  return {
    contracts: { pools, fmtMultiFeeDistributionContracts },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: (...args) => getLendingPoolBalances(...args, chefIncentivesControllerContract),
      fmtMultiFeeDistributionContracts: (...args) =>
        getUWUMultiFeeDistributionBalances(...args, {
          multiFeeDistribution: multiFeeDistributionContract,
          lendingPool: lendingPoolContract,
          stakingToken: UWU_WETH as Token,
        }),
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

export const config: AdapterConfig = {
  startDate: 1673395200,
}

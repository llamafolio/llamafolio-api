import { getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/geist/lending'
import { Token } from '@lib/token'

import { getMultiFeeDistributionBalances } from './lock'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'UwU Lending',
  chain: 'ethereum',
  address: '0x2409aF0251DCB89EE3Dee572629291f9B087c668',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'UwU Locker',
  chain: 'ethereum',
  address: '0x7c0bF1108935e7105E218BBB4f670E5942c5e237',
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

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts({
    ctx,
    lendingPool: lendingPoolContract,
    chefIncentivesController: chefIncentivesControllerContract,
    rewardToken: UwU,
  })

  return {
    contracts: { pools },
  }
}

function getLendingBalances(ctx: BalancesContext, contracts: Contract[]) {
  return Promise.all([
    getLendingPoolBalances(ctx, contracts, {
      chefIncentivesController: chefIncentivesControllerContract,
    }),
    getMultiFeeDistributionBalances(ctx, contracts, {
      multiFeeDistributionAddress: multiFeeDistributionContract.address,
    }),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getLendingBalances,
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    balances,
    healthFactor,
  }
}

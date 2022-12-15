import { getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'
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

export const getContracts = async () => {
  const pools = await getLendingPoolContracts({
    chain: 'ethereum',
    lendingPool: lendingPoolContract,
    chefIncentivesController: chefIncentivesControllerContract,
    rewardToken: UwU,
  })

  return {
    contracts: { pools },
  }
}

function getLendingBalances(ctx: BalancesContext, chain: Chain, contracts: Contract[]) {
  return Promise.all([
    getLendingPoolBalances(ctx, chain, contracts, {
      chefIncentivesController: chefIncentivesControllerContract,
    }),
    getMultiFeeDistributionBalances(ctx, chain, contracts, {
      multiFeeDistributionAddress: multiFeeDistributionContract.address,
    }),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
      pools: getLendingBalances,
    }),
    getLendingPoolHealthFactor(ctx, 'ethereum', lendingPoolContract),
  ])

  return {
    balances,
    healthFactor,
  }
}

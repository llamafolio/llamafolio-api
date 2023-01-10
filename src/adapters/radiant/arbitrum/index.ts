import { getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/geist/lending'
import { getMultiFeeDistributionBalances } from '@lib/geist/stake'
import { Token } from '@lib/token'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'Radiant Lending',
  chain: 'arbitrum',
  address: '0x2032b9a8e9f7e76768ca9271003d3e43e1616b1f',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'Radiant multiFeeDistribution',
  chain: 'arbitrum',
  address: '0xc2054a8c33bfce28de8af4af548c48915c455c13',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'Radiant incentives controller',
  chain: 'arbitrum',
  address: '0x287ff908b4db0b29b65b8442b0a5840455f0db32',
}

const radiantToken: Token = {
  chain: 'arbitrum',
  address: '0x0c4681e6c0235179ec3d4f4fc4df3d14fdd96017',
  symbol: 'RDNT',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts({
    ctx,
    lendingPool: lendingPoolContract,
    chefIncentivesController: chefIncentivesControllerContract,
    rewardToken: radiantToken,
  })

  return {
    contracts: { pools },
  }
}

function getLendingBalances(ctx: BalancesContext, contracts: Contract[]) {
  return Promise.all([
    getLendingPoolBalances(ctx, contracts, { chefIncentivesController: chefIncentivesControllerContract }),
    getMultiFeeDistributionBalances(ctx, contracts, {
      multiFeeDistribution: multiFeeDistributionContract,
      lendingPool: lendingPoolContract,
      stakingToken: radiantToken,
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

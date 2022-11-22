import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/geist/lending'
import { getMultiFeeDistributionBalances } from '@lib/geist/stake'
import { Token } from '@lib/token'

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

const getContracts = async () => {
  const pools = await getLendingPoolContracts({
    chain: 'fantom',
    lendingPool: lendingPoolContract,
    chefIncentivesController: chefIncentivesControllerContract,
    rewardToken: geistToken,
  })

  return {
    contracts: { pools },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const lendingPoolBalances = await getLendingPoolBalances(ctx, 'fantom', pools || [], {
    chefIncentivesController: chefIncentivesControllerContract,
  })

  const multiFeeDistributionBalances = await getMultiFeeDistributionBalances(ctx, 'fantom', pools || [], {
    multiFeeDistribution: multiFeeDistributionContract,
    lendingPool: lendingPoolContract,
    stakingToken: geistToken,
  })

  const balances = lendingPoolBalances.concat(multiFeeDistributionBalances)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'geist-finance',
  getContracts,
  getBalances,
}

export default adapter

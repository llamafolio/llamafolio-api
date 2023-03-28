import { getLendingPoolHealthFactor } from '@adapters/aave-v3/common/lending'
import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/geist/lending'
import { getMultiFeeDistributionBalances, getMultiFeeDistributionContracts } from '@lib/geist/stake'
import { Token } from '@lib/token'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'Valas Lending',
  chain: 'bsc',
  address: '0xe29a55a6aeff5c8b1beede5bcf2f0cb3af8f91f5',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'Valas Locker',
  chain: 'bsc',
  address: '0x685d3b02b9b0f044a3c01dbb95408fc2eb15a3b3',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'Valas incentives controller',
  chain: 'bsc',
  address: '0xb7c1d99069a4eb582fc04e7e1124794000e7ecbf',
}

const valasToken: Token = {
  chain: 'bsc',
  address: '0xb1ebdd56729940089ecc3ad0bbeeb12b6842ea6f',
  symbol: 'VALAS',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, fmtMultiFeeDistributionContracts] = await Promise.all([
    getLendingPoolContracts(ctx, lendingPoolContract, chefIncentivesControllerContract, valasToken),
    getMultiFeeDistributionContracts(ctx, multiFeeDistributionContract, valasToken),
  ])

  return {
    contracts: { pools, fmtMultiFeeDistributionContracts },
    props: { fmtMultiFeeDistributionContracts },
  }
}

async function getLendingBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  fmtMultifeeDistributionContract: Contract,
) {
  const [lendBalances, multifeeBalances] = await Promise.all([
    getLendingPoolBalances(ctx, contracts, chefIncentivesControllerContract),
    getMultiFeeDistributionBalances(ctx, contracts, {
      multiFeeDistribution: multiFeeDistributionContract,
      multiFeeDistributionContract: fmtMultifeeDistributionContract,
      lendingPool: lendingPoolContract,
      stakingToken: valasToken,
    }),
  ])

  return [...lendBalances, ...multifeeBalances!]
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts, props) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: (...args) => getLendingBalances(...args, props.fmtMultiFeeDistributionContracts),
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

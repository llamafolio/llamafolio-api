import { getLendingRewardsBalances } from '@adapters/aave/v2/common/rewards'
import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'

const lendingPool: Contract = {
  name: 'Lending Pool',
  address: '0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c',
  chain: 'avax',
}

const WAVAX: Contract = {
  chain: 'avax',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  name: 'Wrapped AVAX',
  symbol: 'WAVAX',
  decimals: 18,
  coingeckoId: 'wrapped-avax',
}

const incentiveController: Contract = {
  name: 'Aave Incentive Controller',
  address: '0x01d83fe6a10d2f2b7af17034343746188272cac9',
  chain: 'avax',
}

export const getContracts = async () => {
  const pools = await getLendingPoolContracts('avax', lendingPool)

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const [lendingPoolBalances, rewardsPoolBalances, healthFactor] = await Promise.all([
    getLendingPoolBalances(ctx, 'avax', pools || []),
    getLendingRewardsBalances(ctx, 'avax', pools || [], incentiveController, WAVAX),
    getLendingPoolHealthFactor(ctx, 'avax', lendingPool),
  ])

  return {
    balances: [...lendingPoolBalances, ...rewardsPoolBalances],
    avax: {
      healthFactor,
    },
  }
}

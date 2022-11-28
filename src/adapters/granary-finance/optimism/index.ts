import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'optimism',
  address: '0x8fd4af47e4e63d1d2d45582c3286b4bd9bb95dfe',
  name: 'Lending Pool',
}

export const getContracts = async () => {
  const pools = await getLendingPoolContracts('optimism', lendingPool)

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, 'optimism', contracts, {
      pools: getLendingPoolBalances,
    }),
    getLendingPoolHealthFactor(ctx, 'optimism', lendingPool),
  ])

  return {
    balances,
    healthFactor,
  }
}

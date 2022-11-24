import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'fantom',
  address: '0x7220FFD5Dc173BA3717E47033a01d870f06E5284',
  name: 'Lending Pool',
}

export const getContracts = async () => {
  const pools = await getLendingPoolContracts('fantom', lendingPool)

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, {
      pools: getLendingPoolBalances,
    }),
    getLendingPoolHealthFactor(ctx, 'fantom', lendingPool),
  ])

  return {
    balances,
    healthFactor,
  }
}

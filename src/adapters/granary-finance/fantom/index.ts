import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'

const lendingPool: Contract = {
  chain: 'fantom',
  address: '0x7220FFD5Dc173BA3717E47033a01d870f06E5284',
  name: 'Lending Pool',
}

export const getContracts = async () => {
  const poolsFantom = await getLendingPoolContracts('fantom', lendingPool)

  return {
    contracts: {
      poolsFantom,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { poolsFantom }) => {
  const [lendingPoolBalances, healthFactor] = await Promise.all([
    getLendingPoolBalances(ctx, 'fantom', poolsFantom || []),
    getLendingPoolHealthFactor(ctx, 'fantom', lendingPool),
  ])

  return {
    balances: lendingPoolBalances,
    fantom: {
      healthFactor,
    },
  }
}

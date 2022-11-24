import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'ethereum',
  address: '0xb702ce183b4e1faa574834715e5d4a6378d0eed3',
  name: 'Lending Pool',
}

export const getContracts = async () => {
  const pools = await getLendingPoolContracts('ethereum', lendingPool)

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
      pools: getLendingPoolBalances,
    }),
    getLendingPoolHealthFactor(ctx, 'ethereum', lendingPool),
  ])

  return {
    balances,
    healthFactor,
  }
}

import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'avax',
  address: '0xb702ce183b4e1faa574834715e5d4a6378d0eed3',
  name: 'Lending Pool',
}

export const getContracts = async () => {
  const pools = await getLendingPoolContracts('avax', lendingPool)

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'avax', contracts, {
    pools: getLendingPoolBalances,
  })

  const healthFactor = await getLendingPoolHealthFactor(ctx, 'avax', lendingPool)

  return {
    balances,
    healthFactor,
  }
}

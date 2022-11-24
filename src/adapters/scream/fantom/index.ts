import { GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const markets = await getMarketsContracts('fantom', {
    // Scream Unitroller
    comptrollerAddress: '0x260e596dabe3afc463e75b6cc05d8c46acacfb09',
  })

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { markets }) => {
  const balances = await getMarketsBalances(ctx, 'fantom', markets || [])

  return {
    balances,
  }
}

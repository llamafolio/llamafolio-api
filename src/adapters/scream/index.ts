import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const getContracts = async () => {
  const poolsMarkets = await getMarketsContracts('fantom', {
    // Scream Unitroller
    comptrollerAddress: '0x260e596dabe3afc463e75b6cc05d8c46acacfb09',
  })

  return {
    contracts: poolsMarkets,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await getMarketsBalances(ctx, 'fantom', contracts)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'scream',
  getContracts,
  getBalances,
}

export default adapter

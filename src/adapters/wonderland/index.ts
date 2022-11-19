import * as avax from '@adapters/wonderland/avax'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = () => {
  const avaxContracts = avax.getContracts()

  return {
    contracts: {
      ...avaxContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const avaxBalances = await avax.getBalances(ctx, contracts)

  return {
    ...avaxBalances,

    balances: [...avaxBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'wonderland',
  getContracts,
  getBalances,
}

export default adapter

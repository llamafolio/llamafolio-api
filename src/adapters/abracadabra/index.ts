import { Adapter, GetBalancesHandler } from '@lib/adapter'
import * as ethereum from '@adapters/abracadabra/ethereum'
import * as avax from '@adapters/abracadabra/avax'
import * as fantom from '@adapters/abracadabra/fantom'

const getContracts = async () => {
  const ethereumContracts = await ethereum.getContracts()
  const avaxContracts = await avax.getContracts()
  const fantomContracts = await fantom.getContracts()

  return {
    contracts: {
      ...ethereumContracts.contracts,
      ...avaxContracts.contracts,
      ...fantomContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const ethereumBalances = await ethereum.getBalances(ctx, contracts)
  const avaxBalances = await avax.getBalances(ctx, contracts)
  const fantomBalances = await fantom.getBalances(ctx, contracts)

  return {
    ...ethereumBalances,
    ...avaxBalances,
    ...fantomBalances,
    balances: [...ethereumBalances.balances, ...avaxBalances.balances, ...fantomBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'abracadabra',
  getContracts,
  getBalances,
}

export default adapter

import * as avax from '@adapters/abracadabra/avax'
import * as ethereum from '@adapters/abracadabra/ethereum'
import * as fantom from '@adapters/abracadabra/fantom'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const [avaxContracts, ethereumContracts, fantomContracts] = await Promise.all([
    avax.getContracts(),
    ethereum.getContracts(),
    fantom.getContracts(),
  ])

  return {
    contracts: {
      ...avaxContracts.contracts,
      ...ethereumContracts.contracts,
      ...fantomContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [avaxBalances, ethereumBalances, fantomBalances] = await Promise.all([
    avax.getBalances(ctx, contracts),
    ethereum.getBalances(ctx, contracts),
    fantom.getBalances(ctx, contracts),
  ])

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

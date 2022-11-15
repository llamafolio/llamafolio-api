import * as arbitrum from '@adapters/aave/v3/arbitrum'
import * as avax from '@adapters/aave/v3/avax'
import * as fantom from '@adapters/aave/v3/fantom'
import * as polygon from '@adapters/aave/v3/polygon'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const [arbitrumContracts, avaxContracts, fantomContracts, polygonContracts] = await Promise.all([
    arbitrum.getContracts(),
    avax.getContracts(),
    fantom.getContracts(),
    polygon.getContracts(),
  ])

  return {
    contracts: {
      ...arbitrumContracts.contracts,
      ...avaxContracts.contracts,
      ...fantomContracts.contracts,
      ...polygonContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [arbitrumBalances, avaxBalances, fantomBalances, polygonBalances] = await Promise.all([
    arbitrum.getBalances(ctx, contracts),
    avax.getBalances(ctx, contracts),
    fantom.getBalances(ctx, contracts),
    polygon.getBalances(ctx, contracts),
  ])

  return {
    ...arbitrumBalances,
    ...avaxBalances,
    ...fantomBalances,
    ...polygonBalances,
    balances: [...avaxBalances.balances, ...fantomBalances.balances, ...polygonBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'aave-v3',
  getContracts,
  getBalances,
}

export default adapter

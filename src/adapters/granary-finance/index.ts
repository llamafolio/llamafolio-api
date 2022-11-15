import * as avax from '@adapters/granary-finance/avax'
import * as ethereum from '@adapters/granary-finance/ethereum'
import * as fantom from '@adapters/granary-finance/fantom'
import * as optimism from '@adapters/granary-finance/optimism'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const [avaxContracts, ethereumContracts, fantomContracts, optimismContracts] = await Promise.all([
    avax.getContracts(),
    ethereum.getContracts(),
    fantom.getContracts(),
    optimism.getContracts(),
  ])

  return {
    contracts: {
      ...avaxContracts.contracts,
      ...ethereumContracts.contracts,
      ...fantomContracts.contracts,
      ...optimismContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [avaxBalances, ethereumBalances, fantomBalances, optimismBalances] = await Promise.all([
    avax.getBalances(ctx, contracts),
    ethereum.getBalances(ctx, contracts),
    fantom.getBalances(ctx, contracts),
    optimism.getBalances(ctx, contracts),
  ])

  return {
    ...avaxBalances,
    ...ethereumBalances,
    ...fantomBalances,
    ...optimismBalances,
    balances: [
      ...avaxBalances.balances,
      ...ethereumBalances.balances,
      ...fantomBalances.balances,
      ...optimismBalances.balances,
    ],
  }
}

const adapter: Adapter = {
  id: 'granary-finance',
  getContracts,
  getBalances,
}

export default adapter

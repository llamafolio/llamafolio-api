import * as arbitrum from '@adapters/lido/arbitrum'
import * as ethereum from '@adapters/lido/ethereum'
import * as optimism from '@adapters/lido/optimism'
import * as polygon from '@adapters/lido/polygon'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const [arbitrumContracts, ethereumContracts, optimismContracts, polygonContracts] = await Promise.all([
    arbitrum.getContracts(),
    ethereum.getContracts(),
    optimism.getContracts(),
    polygon.getContracts(),
  ])

  return {
    contracts: {
      ...arbitrumContracts.contracts,
      ...ethereumContracts.contracts,
      ...optimismContracts.contracts,
      ...polygonContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [arbitrumBalances, ethereumBalances, optimismBalances, polygonBalances] = await Promise.all([
    arbitrum.getBalances(ctx, contracts),
    ethereum.getBalances(ctx, contracts),
    optimism.getBalances(ctx, contracts),
    polygon.getBalances(ctx, contracts),
  ])

  return {
    balances: [
      ...arbitrumBalances.balances,
      ...ethereumBalances.balances,
      ...optimismBalances.balances,
      ...polygonBalances.balances,
    ],
  }
}

const adapter: Adapter = {
  id: 'lido',
  getContracts,
  getBalances,
}

export default adapter

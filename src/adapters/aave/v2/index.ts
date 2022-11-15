import * as avax from '@adapters/aave/v2/avax'
import * as ethereum from '@adapters/aave/v2/ethereum'
import * as polygon from '@adapters/aave/v2/polygon'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const [avaxContracts, ethereumContracts, polygonContracts] = await Promise.all([
    avax.getContracts(),
    ethereum.getContracts(),
    polygon.getContracts(),
  ])

  return {
    contracts: {
      ...avaxContracts.contracts,
      ...ethereumContracts.contracts,
      ...polygonContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [avaxBalances, ethereumBalances, polygonBalances] = await Promise.all([
    avax.getBalances(ctx, contracts),
    ethereum.getBalances(ctx, contracts),
    polygon.getBalances(ctx, contracts),
  ])

  return {
    ...avaxBalances,
    ...ethereumBalances,
    ...polygonBalances,
    balances: [...avaxBalances.balances, ...ethereumBalances.balances, ...polygonBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'aave-v2',
  getContracts,
  getBalances,
}

export default adapter

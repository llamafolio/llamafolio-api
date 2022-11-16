import { Adapter, GetBalancesHandler } from '@lib/adapter'
import * as ethereum from '@adapters/compound/v3/ethereum'

const getContracts = async () => {
  const ethereumContracts = await ethereum.getContracts()

  return {
    contracts: {
      ...ethereumContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const ethereumBalances = await ethereum.getBalances(ctx, contracts)

  return {
    ...ethereumBalances,
    balances: [...ethereumBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'compound',
  getContracts,
  getBalances,
}

export default adapter

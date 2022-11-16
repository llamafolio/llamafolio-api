import * as bsc from '@adapters/venus/bsc'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const bscContracts = await bsc.getContracts()

  return {
    contracts: {
      ...bscContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const bscBalances = await bsc.getBalances(ctx, contracts)

  return {
    ...bscBalances,
    balances: [...bscBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'venus',
  getContracts,
  getBalances,
}

export default adapter

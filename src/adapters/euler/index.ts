import { Adapter, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

import { getPositions } from './markets'

const contract: Contract = {
  name: 'eulerMarkets',
  displayName: 'Markets Euler',
  chain: 'ethereum',
  address: '0x3520d5a913427E6F0D6A83E07ccD4A4da316e4d3',
}

const getContracts = () => {
  return {
    contracts: [contract],
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts: Contract[]) => {
  const balances = await getPositions(ctx, 'ethereum', contracts)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'euler',
  getContracts,
  getBalances,
}

export default adapter

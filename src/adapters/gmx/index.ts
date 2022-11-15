import * as arbitrum from '@adapters/gmx/arbitrum'
import * as avax from '@adapters/gmx/avax'
import { Adapter, GetBalancesHandler } from '@lib/adapter'

const getContracts = async () => {
  const [avaxGMX, arbitrumGMX] = await Promise.all([avax.getContracts(), arbitrum.getContracts()])

  return {
    contracts: { ...avaxGMX.contracts, ...arbitrumGMX.contracts },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [avaxGMXBalances, arbitrumGMXBalances] = await Promise.all([
    avax.getBalances(ctx, contracts),
    arbitrum.getBalances(ctx, contracts),
  ])

  return {
    ...avaxGMXBalances,
    ...arbitrumGMXBalances,
    balances: [...avaxGMXBalances.balances, ...arbitrumGMXBalances.balances],
  }
}

const adapter: Adapter = {
  id: 'gmx',
  getContracts,
  getBalances,
}

export default adapter

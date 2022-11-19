import * as arbitrum from '@adapters/gmx/arbitrum'
import * as avax from '@adapters/gmx/avax'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ arbitrum, avax })

const adapter: Adapter = {
  id: 'gmx',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

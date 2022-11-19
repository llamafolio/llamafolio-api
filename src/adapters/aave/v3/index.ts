import * as arbitrum from '@adapters/aave/v3/arbitrum'
import * as avax from '@adapters/aave/v3/avax'
import * as fantom from '@adapters/aave/v3/fantom'
import * as polygon from '@adapters/aave/v3/polygon'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ arbitrum, avax, fantom, polygon })

const adapter: Adapter = {
  id: 'aave-v3',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

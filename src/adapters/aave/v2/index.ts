import * as avax from '@adapters/aave/v2/avax'
import * as ethereum from '@adapters/aave/v2/ethereum'
import * as polygon from '@adapters/aave/v2/polygon'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ avax, ethereum, polygon })

const adapter: Adapter = {
  id: 'aave-v2',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

import * as avax from '@adapters/abracadabra/avax'
import * as ethereum from '@adapters/abracadabra/ethereum'
import * as fantom from '@adapters/abracadabra/fantom'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ avax, ethereum, fantom })

const adapter: Adapter = {
  id: 'abracadabra',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

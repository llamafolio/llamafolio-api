import * as avax from '@adapters/granary-finance/avax'
import * as ethereum from '@adapters/granary-finance/ethereum'
import * as fantom from '@adapters/granary-finance/fantom'
import * as optimism from '@adapters/granary-finance/optimism'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ avax, ethereum, fantom, optimism })

const adapter: Adapter = {
  id: 'granary-finance',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

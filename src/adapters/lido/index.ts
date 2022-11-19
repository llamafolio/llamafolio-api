import * as arbitrum from '@adapters/lido/arbitrum'
import * as ethereum from '@adapters/lido/ethereum'
import * as optimism from '@adapters/lido/optimism'
import * as polygon from '@adapters/lido/polygon'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ arbitrum, ethereum, optimism, polygon })

const adapter: Adapter = {
  id: 'lido',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

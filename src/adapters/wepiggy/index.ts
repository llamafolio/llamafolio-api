import * as arbitrum from '@adapters/wepiggy/arbitrum'
import * as bsc from '@adapters/wepiggy/bsc'
import * as ethereum from '@adapters/wepiggy/ethereum'
import * as optimism from '@adapters/wepiggy/optimism'
import * as polygon from '@adapters/wepiggy/polygon'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ arbitrum, bsc, ethereum, optimism, polygon })

const adapter: Adapter = {
  id: 'wepiggy',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

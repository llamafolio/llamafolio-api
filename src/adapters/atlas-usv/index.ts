import * as avax from '@adapters/atlas-usv/avax'
import * as bsc from '@adapters/atlas-usv/bsc'
import * as ethereum from '@adapters/atlas-usv/ethereum'
import * as polygon from '@adapters/atlas-usv/polygon'
import { Adapter, mergeAdapters } from '@lib/adapter'

const multiChainAdapter = mergeAdapters({ avax, bsc, ethereum, polygon })

const adapter: Adapter = {
  id: 'atlas-usv',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

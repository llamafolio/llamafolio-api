import { Adapter, mergeAdapters } from '@lib/adapter'

import * as avax from './avax'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'

const multiChainAdapter = mergeAdapters({ avax, ethereum, fantom, optimism })

const adapter: Adapter = {
  id: 'iron-bank',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

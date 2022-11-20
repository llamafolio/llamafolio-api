import { Adapter, mergeAdapters } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avax from './avax'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'
import * as polygon from './polygon'

const multiChainAdapter = mergeAdapters({ arbitrum, avax, bsc, ethereum, fantom, optimism, polygon })

const adapter: Adapter = {
  id: 'stargate',
  getContracts: multiChainAdapter.getContracts,
  getBalances: multiChainAdapter.getBalances,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'granary-finance',
  avalanche,
  ethereum,
  fantom,
  optimism,
  arbitrum,
  bsc,
  base,
}

export default adapter

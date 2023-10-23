import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'reaper-farm',
  optimism: optimism,
  fantom: fantom,
  arbitrum: arbitrum,
  bsc: bsc,
}

export default adapter

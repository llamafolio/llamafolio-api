import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'
import * as fantom from './fantom'
import * as arbitrum from './arbitrum'
import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'reaper-farm',
  optimism: optimism,
  fantom: fantom,
  arbitrum: arbitrum,
  bsc: bsc,
}

export default adapter

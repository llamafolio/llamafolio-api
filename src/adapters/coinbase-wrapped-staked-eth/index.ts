import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'coinbase-wrapped-staked-eth',
  arbitrum,
  base,
  ethereum,
  optimism,
  polygon,
}

export default adapter

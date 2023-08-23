import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'overnight-finance',
  optimism,
  base,
  arbitrum,
  polygon,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as fantom from './fantom'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'matrix-farm',
  arbitrum: arbitrum,
  base: base,
  fantom: fantom,
  optimism: optimism,
}

export default adapter

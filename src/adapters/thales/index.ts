import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'thales',
  optimism: optimism,
  arbitrum: arbitrum,
  base: base,
}

export default adapter

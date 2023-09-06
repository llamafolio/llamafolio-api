import type { Adapter } from '@lib/adapter'

import * as base from './base'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'sonne-finance',
  optimism,
  base,
}

export default adapter

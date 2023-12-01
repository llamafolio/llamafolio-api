import type { Adapter } from '@lib/adapter'

import * as base from './base'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'reserve',
  ethereum,
  base,
}

export default adapter

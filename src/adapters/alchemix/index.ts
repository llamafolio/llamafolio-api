import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'alchemix',
  ethereum,
  fantom,
}

export default adapter

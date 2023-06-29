import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'ankr',
  ethereum,
  bsc,
  fantom,
  avalanche,
}

export default adapter

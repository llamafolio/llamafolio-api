import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'everrise',
  ethereum,
  bsc,
  avalanche,
  fantom,
  polygon,
}

export default adapter

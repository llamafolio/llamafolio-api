import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'cyclone',
  ethereum: ethereum,
  bsc: bsc,
  polygon: polygon,
}

export default adapter

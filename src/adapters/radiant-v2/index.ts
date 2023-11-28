import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'radiant-v2',
  arbitrum,
  bsc,
  ethereum,
}

export default adapter

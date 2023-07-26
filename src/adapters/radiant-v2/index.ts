import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'radiant-v2',
  arbitrum,
  bsc,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'wombat-exchange',
  bsc,
  arbitrum,
}

export default adapter

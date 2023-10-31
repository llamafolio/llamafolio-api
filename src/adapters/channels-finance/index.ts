import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'channels-finance',
  bsc: bsc,
  arbitrum: arbitrum,
}

export default adapter

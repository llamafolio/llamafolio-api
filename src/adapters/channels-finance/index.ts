import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'channels-finance',
  bsc: bsc,
  arbitrum: arbitrum,
}

export default adapter

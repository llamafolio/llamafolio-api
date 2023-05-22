import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'convex-finance',
  ethereum,
  polygon,
  arbitrum,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'cream-finance',
  ethereum: ethereum,
  bsc: bsc,
  polygon: polygon,
  arbitrum: arbitrum,
}

export default adapter

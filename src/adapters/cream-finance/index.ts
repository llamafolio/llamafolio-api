import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as bsc from './bsc'
import * as polygon from './polygon'
import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'cream-finance',
  ethereum: ethereum,
  bsc: bsc,
  polygon: polygon,
  arbitrum: arbitrum,
}

export default adapter

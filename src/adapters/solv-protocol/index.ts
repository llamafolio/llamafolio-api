import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'solv-protocol',
  ethereum: ethereum,
  bsc: bsc,
  arbitrum: arbitrum,
  polygon: polygon,
}

export default adapter

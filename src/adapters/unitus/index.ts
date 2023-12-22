import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as bsc from './bsc'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'unitus',
  arbitrum: arbitrum,
  ethereum: ethereum,
  bsc: bsc,
  optimism: optimism,
  polygon: polygon,
}

export default adapter

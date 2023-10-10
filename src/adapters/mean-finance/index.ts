import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as polygon from './polygon'
import * as optimism from './optimism'
import * as ethereum from './ethereum'
import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'mean-finance',
  arbitrum: arbitrum,
  polygon: polygon,
  optimism: optimism,
  ethereum: ethereum,
  bsc: bsc,
}

export default adapter

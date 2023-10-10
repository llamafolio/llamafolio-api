import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'mean-finance',
  arbitrum,
  polygon,
  optimism,
  ethereum,
  bsc: bsc,
}

export default adapter

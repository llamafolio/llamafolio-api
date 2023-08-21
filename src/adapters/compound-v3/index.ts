import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'compound-v3',
  ethereum,
  polygon,
  arbitrum,
  base,
}

export default adapter

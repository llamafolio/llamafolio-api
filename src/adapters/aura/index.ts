import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'aura',
  ethereum,
  arbitrum,
  optimism,
  polygon,
  gnosis,
}

export default adapter

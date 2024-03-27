import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'
import * as base from './base'
import * as arbitrum from './arbitrum'
import * as polygon from './polygon'
import * as ethereum from './ethereum'
import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'definitive.fi',
  optimism: optimism,
  base: base,
  arbitrum: arbitrum,
  polygon: polygon,
  ethereum: ethereum,
  avalanche: avalanche,
}

export default adapter

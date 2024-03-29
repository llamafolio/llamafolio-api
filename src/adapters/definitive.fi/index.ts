import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

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

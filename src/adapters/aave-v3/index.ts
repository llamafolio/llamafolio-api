import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'aave-v3',
  arbitrum,
  avalanche,
  fantom,
  polygon,
  ethereum,
  optimism,
  base,
  gnosis,
}

export default adapter

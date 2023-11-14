import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as base from './base'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'beefy',
  ethereum,
  polygon,
  optimism,
  arbitrum,
  bsc,
  base,
  fantom,
  gnosis,
}

export default adapter

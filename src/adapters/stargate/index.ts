import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as linea from './linea'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'stargate',
  arbitrum,
  avalanche,
  bsc,
  ethereum,
  fantom,
  optimism,
  polygon,
  base,
  linea,
}

export default adapter

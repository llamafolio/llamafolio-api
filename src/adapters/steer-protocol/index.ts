import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bsc from './bsc'
import * as linea from './linea'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'steer-protocol',
  polygon: polygon,
  arbitrum: arbitrum,
  linea: linea,
  optimism: optimism,
  base: base,
  bsc: bsc,
  avalanche: avalanche,
}

export default adapter

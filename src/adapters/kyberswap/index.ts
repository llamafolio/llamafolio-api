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
  id: 'kyberswap',
  arbitrum: arbitrum,
  optimism: optimism,
  ethereum: ethereum,
  linea: linea,
  avalanche: avalanche,
  fantom: fantom,
  bsc: bsc,
  polygon: polygon,
  base: base,
}

export default adapter

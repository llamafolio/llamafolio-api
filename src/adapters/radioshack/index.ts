import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'radioshack',
  fantom: fantom,
  optimism: optimism,
  ethereum: ethereum,
  polygon: polygon,
  avalanche: avalanche,
  bsc: bsc,
}

export default adapter

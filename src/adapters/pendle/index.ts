import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as optimism from './optimism'
import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'pendle',
  ethereum: ethereum,
  arbitrum: arbitrum,
  bsc: bsc,
  optimism: optimism,
  avalanche: avalanche,
}

export default adapter

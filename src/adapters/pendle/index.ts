import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'pendle',
  ethereum: ethereum,
  arbitrum: arbitrum,
  bsc: bsc,
  optimism: optimism,
  avalanche: avalanche,
}

// TODO: find a way to retrieve real pendingRewards

export default adapter

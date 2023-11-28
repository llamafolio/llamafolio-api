import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'equilibria',
  ethereum: ethereum,
  arbitrum: arbitrum,
  bsc: bsc,
  optimism: optimism,
}

export default adapter

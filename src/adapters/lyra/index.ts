import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'lyra',
  arbitrum,
  optimism,
  ethereum,
}

// TODO: Perpetuals

export default adapter

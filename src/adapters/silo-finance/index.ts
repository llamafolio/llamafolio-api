import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'silo-finance',
  ethereum,
  arbitrum,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'lybra-v2',
  ethereum,
  arbitrum,
}

export default adapter

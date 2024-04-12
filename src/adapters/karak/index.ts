import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'karak',
  ethereum: ethereum,
  arbitrum: arbitrum,
}

export default adapter

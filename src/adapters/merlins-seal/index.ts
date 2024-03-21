import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'merlins-seal',
  arbitrum: arbitrum,
  ethereum: ethereum,
}

export default adapter

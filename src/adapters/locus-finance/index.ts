import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'locus-finance',
  ethereum: ethereum,
  arbitrum: arbitrum,
}

export default adapter

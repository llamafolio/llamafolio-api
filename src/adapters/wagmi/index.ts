import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as zksyncEra from './zksync-era'

const adapter: Adapter = {
  id: 'wagmi',
  ethereum: ethereum,
  fantom: fantom,
  'zksync-era': zksyncEra,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as zksyncEra from './zksync-era'

const adapter: Adapter = {
  id: 'zerolend',
  'zksync-era': zksyncEra,
}

export default adapter

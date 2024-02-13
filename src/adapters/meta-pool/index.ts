import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'meta-pool',
  ethereum: ethereum,
}

export default adapter

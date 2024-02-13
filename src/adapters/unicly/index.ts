import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'unicly',
  ethereum: ethereum,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'vector-reserve',
  ethereum: ethereum,
}

export default adapter

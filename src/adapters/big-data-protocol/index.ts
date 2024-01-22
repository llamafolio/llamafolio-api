import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'big-data-protocol',
  ethereum: ethereum,
}

export default adapter

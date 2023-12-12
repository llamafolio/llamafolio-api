import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'b.protocol',
  ethereum: ethereum,
}

export default adapter

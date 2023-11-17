import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'mountain-protocol',
  ethereum: ethereum,
}

export default adapter

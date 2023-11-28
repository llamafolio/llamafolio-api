import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'mev-protocol',
  ethereum: ethereum,
}

export default adapter

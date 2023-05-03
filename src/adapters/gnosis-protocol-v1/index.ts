import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'gnosis-protocol-v1',
  ethereum,
}

export default adapter

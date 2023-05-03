import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'keep3r-network',
  ethereum,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'eigenlayer',
  ethereum,
}

export default adapter

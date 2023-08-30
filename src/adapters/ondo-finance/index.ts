import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'ondo-finance',
  ethereum,
}

export default adapter

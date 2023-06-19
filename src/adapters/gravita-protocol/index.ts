import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'gravita-protocol',
  ethereum,
}

export default adapter

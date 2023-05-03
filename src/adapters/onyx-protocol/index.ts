import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'onyx-protocol',
  ethereum,
}

export default adapter

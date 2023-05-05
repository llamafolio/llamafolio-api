import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'asymetrix-protocol',
  ethereum,
}

export default adapter

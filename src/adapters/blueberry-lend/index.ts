import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'blueberry-lend',
  ethereum: ethereum,
}

export default adapter

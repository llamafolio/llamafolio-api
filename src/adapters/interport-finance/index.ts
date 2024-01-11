import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'interport-finance',

  ethereum: ethereum,
}

export default adapter

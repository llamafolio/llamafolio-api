import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'citadao',
  ethereum: ethereum,
}

export default adapter

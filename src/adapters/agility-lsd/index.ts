import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'agility-lsd',
  ethereum,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'paladin-warlord',
  ethereum,
}

export default adapter

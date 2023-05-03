import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'gro',
  ethereum,
  avalanche,
}

export default adapter

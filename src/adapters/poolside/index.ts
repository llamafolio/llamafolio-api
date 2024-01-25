import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as base from './base'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'poolside',
  avalanche: avalanche,
  ethereum: ethereum,
  base: base,
}

export default adapter

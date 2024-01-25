import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as ethereum from './ethereum'
import * as base from './base'

const adapter: Adapter = {
  id: 'poolside',
  avalanche: avalanche,
  ethereum: ethereum,
  base: base,
}

export default adapter

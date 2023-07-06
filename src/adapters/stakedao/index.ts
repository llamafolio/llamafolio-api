import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'stakedao',
  ethereum,
  polygon,
  avalanche,
  bsc,
}

export default adapter

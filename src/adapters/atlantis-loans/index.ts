import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as bsc from './bsc'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'atlantis-loans',
  bsc,
  polygon,
  avalanche,
}

export default adapter

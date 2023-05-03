import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'aave-v2',
  avalanche,
  ethereum,
  polygon,
}

export default adapter

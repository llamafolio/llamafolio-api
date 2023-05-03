import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'gmx',
  arbitrum,
  avalanche,
}

export default adapter

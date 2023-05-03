import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'aave-v3',
  arbitrum,
  avalanche,
  fantom,
  polygon,
}

export default adapter

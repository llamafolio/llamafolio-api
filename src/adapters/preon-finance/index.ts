import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'preon-finance',
  arbitrum: arbitrum,
  polygon: polygon,
}

export default adapter

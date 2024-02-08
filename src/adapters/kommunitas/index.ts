import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'
import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'kommunitas',
  polygon: polygon,
  arbitrum: arbitrum,
}

export default adapter

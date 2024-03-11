import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'virtuswap',
  polygon: polygon,
  arbitrum: arbitrum,
}

export default adapter

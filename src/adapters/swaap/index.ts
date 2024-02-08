import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'swaap',
  polygon: polygon,
  ethereum: ethereum,
  arbitrum: arbitrum,
}

export default adapter

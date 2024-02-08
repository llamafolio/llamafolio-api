import type { Adapter } from '@lib/adapter'

import * as polygon from './polygon'
import * as ethereum from './ethereum'
import * as arbitrum from './arbitrum'

const adapter: Adapter = {
  id: 'swaap',
  polygon: polygon,
  ethereum: ethereum,
  arbitrum: arbitrum,
}

export default adapter

import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'get-protocol',
  ethereum: ethereum,
  polygon: polygon,
}

export default adapter

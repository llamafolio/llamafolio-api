import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as polygon from './polygon'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'parallel-protocol',
  ethereum: ethereum,
  polygon: polygon,
  fantom: fantom,
}

export default adapter

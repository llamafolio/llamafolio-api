import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'parallel-protocol',
  ethereum: ethereum,
  polygon: polygon,
  fantom: fantom,
}

export default adapter

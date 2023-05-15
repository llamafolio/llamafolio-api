import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as fantom from './fantom'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'badger-dao',
  ethereum,
  fantom,
  arbitrum,
  polygon,
}

export default adapter

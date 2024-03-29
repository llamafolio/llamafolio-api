import type { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as gnosis from './gnosis'

const adapter: Adapter = {
  id: 'swapr',
  gnosis: gnosis,
  arbitrum: arbitrum,
  ethereum: ethereum,
}

export default adapter

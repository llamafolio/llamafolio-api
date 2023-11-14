import type { Adapter } from '@lib/adapter'

import * as gnosis from './gnosis'
import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'swapr',
  gnosis: gnosis,
  arbitrum: arbitrum,
  ethereum: ethereum,
}

export default adapter

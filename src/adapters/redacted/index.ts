import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'redacted',
  ethereum,
  arbitrum,
}

export default adapter

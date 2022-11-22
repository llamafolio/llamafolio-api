import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as ethereum from './ethereum'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'lido',
  arbitrum,
  ethereum,
  optimism,
}

export default adapter

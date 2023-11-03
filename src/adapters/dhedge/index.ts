import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'dhedge',
  optimism: optimism,
  polygon: polygon,
  ethereum: ethereum,
}

export default adapter

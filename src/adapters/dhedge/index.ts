import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'
import * as polygon from './polygon'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'dhedge',
  optimism: optimism,
  polygon: polygon,
  ethereum: ethereum,
}

export default adapter

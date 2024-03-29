import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'perpetual-protocol',
  optimism: optimism,
  ethereum: ethereum,
}

export default adapter

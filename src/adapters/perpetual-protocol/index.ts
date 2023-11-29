import type { Adapter } from '@lib/adapter'

import * as optimism from './optimism'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'perpetual-protocol',
  optimism: optimism,
  ethereum: ethereum,
}

export default adapter

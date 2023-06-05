import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'coinbase-wrapped-staked-eth',
  ethereum,
}

export default adapter

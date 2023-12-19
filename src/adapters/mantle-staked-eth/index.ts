import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'mantle-staked-eth',
  ethereum: ethereum,
}

export default adapter

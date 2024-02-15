import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'prime-staked-eth',
  ethereum: ethereum,
}

export default adapter

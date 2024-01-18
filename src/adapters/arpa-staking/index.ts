import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'arpa-staking',
  ethereum: ethereum,
}

export default adapter

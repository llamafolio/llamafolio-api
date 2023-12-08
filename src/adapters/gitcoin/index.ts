import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'gitcoin',
  ethereum: ethereum,
}

export default adapter

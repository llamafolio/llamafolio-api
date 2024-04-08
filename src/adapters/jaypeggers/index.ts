import type { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'jaypeggers',
  ethereum: ethereum,
}

export default adapter

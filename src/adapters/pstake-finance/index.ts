import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'pstake-finance',
  ethereum,
  bsc,
}

export default adapter

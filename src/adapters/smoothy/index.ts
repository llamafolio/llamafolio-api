import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'smoothy',
  ethereum,
  bsc,
}

export default adapter

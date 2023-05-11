import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'apollox',
  bsc,
}

export default adapter

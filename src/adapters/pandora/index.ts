import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'pandora',
  bsc,
}

export default adapter

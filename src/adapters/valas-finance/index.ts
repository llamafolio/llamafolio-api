import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'valas-finance',
  bsc,
}

export default adapter

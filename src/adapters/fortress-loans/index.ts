import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'fortress-loans',
  bsc,
}

export default adapter

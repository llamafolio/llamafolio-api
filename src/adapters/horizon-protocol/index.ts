import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'horizon-protocol',
  bsc,
}

export default adapter

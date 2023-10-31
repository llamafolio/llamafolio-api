import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'usdfi-lending',
  bsc: bsc,
}

export default adapter

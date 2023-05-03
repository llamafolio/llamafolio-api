import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'apeswap-lending',
  bsc,
}

export default adapter

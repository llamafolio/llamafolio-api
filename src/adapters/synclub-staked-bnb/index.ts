import type { Adapter } from '@lib/adapter'

import * as bsc from './bsc'

const adapter: Adapter = {
  id: 'synclub-staked-bnb',
  bsc,
}

export default adapter

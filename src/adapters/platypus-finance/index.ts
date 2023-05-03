import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'platypus-finance',
  avalanche,
}

export default adapter

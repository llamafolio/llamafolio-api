import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'snowbank',
  avalanche,
}

export default adapter

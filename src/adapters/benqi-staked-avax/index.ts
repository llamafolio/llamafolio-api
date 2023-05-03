import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'benqi-staked-avax',
  avalanche,
}

export default adapter

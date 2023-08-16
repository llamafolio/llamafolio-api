import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'deltaprime',
  avalanche,
}

// TODO: Leveraged farming

export default adapter

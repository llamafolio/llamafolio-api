import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'vapordex',
  avalanche: avalanche,
}

export default adapter

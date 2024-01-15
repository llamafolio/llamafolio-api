import type { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'gogopool',
  avalanche: avalanche,
}

export default adapter

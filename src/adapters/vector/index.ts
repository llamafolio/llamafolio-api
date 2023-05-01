import { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'vector-finance',
  avalanche,
}

export default adapter

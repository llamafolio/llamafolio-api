import { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'wonderland',
  avalanche,
}

export default adapter

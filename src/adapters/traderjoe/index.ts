import { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'trader-joe',
  avalanche,
}

export default adapter
